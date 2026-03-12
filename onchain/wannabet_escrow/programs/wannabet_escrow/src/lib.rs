use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("36r1hGZPxnwoJRuDQ7Qqf5ndx2FHLRKcQ3iFivkoxZ2L");

const CONFIG_SEED: &[u8] = b"config";
const BET_SEED: &[u8] = b"bet";
const ESCROW_SEED: &[u8] = b"escrow";
const BPS_DENOMINATOR: u64 = 10_000;
const MAX_ODDS_RATIO: u64 = 100;

const DEFAULT_MIN_EXPIRY_SECONDS: i64 = 60;
const TEST_MODE_MIN_EXPIRY_SECONDS: i64 = 5;

#[inline(always)]
fn min_expiry_seconds() -> i64 {
    if cfg!(feature = "test-mode") {
        TEST_MODE_MIN_EXPIRY_SECONDS
    } else {
        DEFAULT_MIN_EXPIRY_SECONDS
    }
}

#[inline(always)]
fn validate_odds_ratio(creator_amount: u64, accepter_amount_required: u64) -> Result<()> {
    require!(creator_amount > 0, ErrorCode::InvalidAmount);
    require!(accepter_amount_required > 0, ErrorCode::InvalidAmount);

    let creator_greater = creator_amount >= accepter_amount_required;

    if creator_greater {
        let max_allowed = accepter_amount_required
            .checked_mul(MAX_ODDS_RATIO)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(creator_amount <= max_allowed, ErrorCode::InvalidOddsRatio);
    } else {
        let max_allowed = creator_amount
            .checked_mul(MAX_ODDS_RATIO)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(
            accepter_amount_required <= max_allowed,
            ErrorCode::InvalidOddsRatio
        );
    }

    Ok(())
}

#[inline(always)]
fn validate_settlement_minute_ts(settlement_minute_ts: i64, now: i64) -> Result<()> {
    require!(
        settlement_minute_ts > now + min_expiry_seconds(),
        ErrorCode::InvalidSettlementMinute
    );
    require!(
        settlement_minute_ts % 60 == 0,
        ErrorCode::InvalidSettlementMinute
    );
    Ok(())
}

#[inline(always)]
fn validate_supported_crypto_price_bet(bet: &Bet) -> Result<()> {
    require!(
        bet.market_kind == MarketKind::CryptoPriceBinary,
        ErrorCode::UnsupportedPriceMarket
    );
    require!(
        bet.price_symbol == PriceSymbol::BtcUsdt,
        ErrorCode::UnsupportedPriceMarket
    );
    require!(
        bet.price_venue == PriceVenue::BinanceSpot,
        ErrorCode::UnsupportedPriceMarket
    );
    require!(bet.comparator != Comparator::Unknown, ErrorCode::InvalidComparator);
    require!(bet.strike_e8 > 0, ErrorCode::InvalidStrike);
    Ok(())
}

#[inline(always)]
fn validate_crypto_price_resolve_ready(bet: &Bet, now: i64) -> Result<()> {
    validate_supported_crypto_price_bet(bet)?;

    let candle_close_ts = bet
        .settlement_minute_ts
        .checked_add(60)
        .ok_or(ErrorCode::MathOverflow)?;

    require!(now >= candle_close_ts, ErrorCode::BetNotExpired);
    Ok(())
}

#[inline(always)]
fn compute_crypto_price_winner_side(bet: &Bet, resolved_price_e8: u64) -> Result<u8> {
    validate_supported_crypto_price_bet(bet)?;
    require!(resolved_price_e8 > 0, ErrorCode::InvalidResolvedPrice);

    let creator_wins = match bet.comparator {
        Comparator::GreaterThanOrEqual => resolved_price_e8 >= bet.strike_e8,
        Comparator::LessThan => resolved_price_e8 < bet.strike_e8,
        Comparator::Unknown => return err!(ErrorCode::InvalidComparator),
    };

    Ok(if creator_wins {
        bet.creator_side
    } else {
        bet.accepter_side
    })
}

#[inline(always)]
fn initialize_new_bet(
    bet: &mut Bet,
    creator: Pubkey,
    mint: Pubkey,
    creator_amount: u64,
    accepter_amount_required: u64,
    expiry_ts: i64,
    creator_side: u8,
    bet_id: u64,
    bump: u8,
) {
    bet.creator = creator;
    bet.accepter = Pubkey::default();
    bet.mint = mint;
    bet.creator_amount = creator_amount;
    bet.accepter_amount_required = accepter_amount_required;
    bet.accepter_amount = 0;
    bet.expiry_ts = expiry_ts;
    bet.state = BetState::Open;
    bet.creator_side = creator_side;
    bet.accepter_side = 0;
    bet.winner_side = 0;
    bet.bet_version = 1;
    bet.market_kind = MarketKind::Custom;
    bet.price_symbol = PriceSymbol::Unknown;
    bet.price_venue = PriceVenue::Unknown;
    bet.settlement_minute_ts = 0;
    bet.comparator = Comparator::Unknown;
    bet.strike_e8 = 0;
    bet.resolved_price_e8 = 0;
    bet.resolved_at_ts = 0;
    bet.resolution_status = ResolutionStatus::Pending;
    bet.payout_claimed = false;
    bet.creator_refund_claimed = false;
    bet.accepter_refund_claimed = false;
    bet.bet_id = bet_id;
    bet.bump = bump;
}

#[program]
pub mod wannabet_escrow {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        fee_vault: Pubkey,
    ) -> Result<()> {
        require!(fee_bps <= BPS_DENOMINATOR as u16, ErrorCode::InvalidFeeBps);

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.payer.key();
        config.fee_bps = fee_bps;
        config.paused = false;
        config.fee_vault = fee_vault;
        Ok(())
    }

    pub fn set_pause(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.paused = paused;
        Ok(())
    }

    pub fn set_fee_bps(ctx: Context<AdminOnly>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= BPS_DENOMINATOR as u16, ErrorCode::InvalidFeeBps);
        let config = &mut ctx.accounts.config;
        config.fee_bps = fee_bps;
        Ok(())
    }

    pub fn set_fee_vault(ctx: Context<SetFeeVault>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.fee_vault = ctx.accounts.fee_vault.key();
        Ok(())
    }

    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_id: u64,
        creator_side: u8,
        creator_amount: u64,
        accepter_amount_required: u64,
        expiry_ts: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(creator_side <= 1, ErrorCode::InvalidSide);
        validate_odds_ratio(creator_amount, accepter_amount_required)?;

        let now = Clock::get()?.unix_timestamp;
        require!(
            expiry_ts > now + min_expiry_seconds(),
            ErrorCode::InvalidExpiry
        );

        let bet = &mut ctx.accounts.bet;
        initialize_new_bet(
            bet,
            ctx.accounts.creator.key(),
            ctx.accounts.mint.key(),
            creator_amount,
            accepter_amount_required,
            expiry_ts,
            creator_side,
            bet_id,
            ctx.bumps.bet,
        );

        token::transfer(ctx.accounts.transfer_to_escrow_ctx(), creator_amount)?;
        Ok(())
    }

    pub fn create_crypto_price_bet(
        ctx: Context<CreateBet>,
        bet_id: u64,
        creator_side: u8,
        creator_amount: u64,
        accepter_amount_required: u64,
        settlement_minute_ts: i64,
        comparator: Comparator,
        strike_e8: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(creator_side <= 1, ErrorCode::InvalidSide);
        validate_odds_ratio(creator_amount, accepter_amount_required)?;

        let now = Clock::get()?.unix_timestamp;
        validate_settlement_minute_ts(settlement_minute_ts, now)?;
        require!(comparator != Comparator::Unknown, ErrorCode::InvalidComparator);
        require!(strike_e8 > 0, ErrorCode::InvalidStrike);

        let bet = &mut ctx.accounts.bet;
        initialize_new_bet(
            bet,
            ctx.accounts.creator.key(),
            ctx.accounts.mint.key(),
            creator_amount,
            accepter_amount_required,
            settlement_minute_ts,
            creator_side,
            bet_id,
            ctx.bumps.bet,
        );

        bet.bet_version = 2;
        bet.market_kind = MarketKind::CryptoPriceBinary;
        bet.price_symbol = PriceSymbol::BtcUsdt;
        bet.price_venue = PriceVenue::BinanceSpot;
        bet.settlement_minute_ts = settlement_minute_ts;
        bet.comparator = comparator;
        bet.strike_e8 = strike_e8;

        token::transfer(ctx.accounts.transfer_to_escrow_ctx(), creator_amount)?;
        Ok(())
    }

    pub fn accept_bet(ctx: Context<AcceptBet>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        let now = Clock::get()?.unix_timestamp;
        let bet = &mut ctx.accounts.bet;

        require!(bet.state == BetState::Open, ErrorCode::InvalidBetState);
        require!(now < bet.expiry_ts, ErrorCode::BetExpired);
        require!(
            amount == bet.accepter_amount_required,
            ErrorCode::AmountMustMatchRequired
        );
        require!(
            ctx.accounts.accepter.key() != bet.creator,
            ErrorCode::CreatorCannotAccept
        );
        require!(
            bet.accepter == Pubkey::default(),
            ErrorCode::AlreadyAccepted
        );

        bet.accepter = ctx.accounts.accepter.key();
        bet.accepter_amount = amount;
        bet.accepter_side = 1u8
            .checked_sub(bet.creator_side)
            .ok_or(ErrorCode::InvalidSide)?;
        bet.state = BetState::Locked;

        token::transfer(ctx.accounts.transfer_to_escrow_ctx(), amount)?;
        Ok(())
    }

    pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

        let bet_key = ctx.accounts.bet.key();
        let creator_amount = ctx.accounts.bet.creator_amount;

        {
            let bet = &mut ctx.accounts.bet;
            require!(bet.state == BetState::Open, ErrorCode::InvalidBetState);
            bet.state = BetState::Cancelled;
        }

        let signer_seeds: &[&[u8]] =
            &[ESCROW_SEED, bet_key.as_ref(), &[ctx.bumps.escrow_authority]];

        token::transfer(
            ctx.accounts
                .transfer_from_escrow_ctx()
                .with_signer(&[signer_seeds]),
            creator_amount,
        )?;

        Ok(())
    }

    pub fn resolve_bet(ctx: Context<ResolveBet>, winner_side: u8) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(winner_side <= 1, ErrorCode::InvalidSide);

        let now = Clock::get()?.unix_timestamp;
        let bet = &mut ctx.accounts.bet;

        require!(
            bet.market_kind == MarketKind::Custom,
            ErrorCode::ManualResolveDisabledForPriceMarket
        );
        require!(bet.state == BetState::Locked, ErrorCode::InvalidBetState);
        require!(now >= bet.expiry_ts, ErrorCode::BetNotExpired);
        require!(
            bet.accepter != Pubkey::default(),
            ErrorCode::WinnerUnavailable
        );

        bet.winner_side = winner_side;
        bet.state = BetState::Resolved;
        bet.resolved_price_e8 = 0;
        bet.resolved_at_ts = now;
        bet.resolution_status = ResolutionStatus::Resolved;
        bet.payout_claimed = false;

        Ok(())
    }

    pub fn resolve_crypto_price_bet(
        ctx: Context<ResolveBet>,
        resolved_price_e8: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

        let now = Clock::get()?.unix_timestamp;
        let bet = &mut ctx.accounts.bet;

        require!(bet.state == BetState::Locked, ErrorCode::InvalidBetState);
        require!(now >= bet.expiry_ts, ErrorCode::BetNotExpired);
        require!(
            bet.accepter != Pubkey::default(),
            ErrorCode::WinnerUnavailable
        );

        validate_crypto_price_resolve_ready(&*bet, now)?;

        let winner_side = compute_crypto_price_winner_side(&*bet, resolved_price_e8)?;

        bet.winner_side = winner_side;
        bet.state = BetState::Resolved;
        bet.resolved_price_e8 = resolved_price_e8;
        bet.resolved_at_ts = now;
        bet.resolution_status = ResolutionStatus::Resolved;
        bet.payout_claimed = false;

        Ok(())
    }

    pub fn void_bet(ctx: Context<ResolveBet>) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

        let now = Clock::get()?.unix_timestamp;
        let bet = &mut ctx.accounts.bet;

        require!(bet.state == BetState::Locked, ErrorCode::InvalidBetState);
        require!(now >= bet.expiry_ts, ErrorCode::BetNotExpired);

        bet.winner_side = 0;
        bet.state = BetState::Resolved;
        bet.resolved_at_ts = now;
        bet.resolution_status = ResolutionStatus::Voided;
        bet.payout_claimed = false;
        bet.creator_refund_claimed = false;
        bet.accepter_refund_claimed = false;

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

        let bet = &mut ctx.accounts.bet;

        require!(bet.state == BetState::Resolved, ErrorCode::InvalidBetState);
        require!(
            bet.resolution_status == ResolutionStatus::Resolved,
            ErrorCode::InvalidBetState
        );
        require!(!bet.payout_claimed, ErrorCode::PayoutAlreadyClaimed);

        let winner = if bet.winner_side == bet.creator_side {
            bet.creator
        } else {
            bet.accepter
        };

        require!(winner != Pubkey::default(), ErrorCode::WinnerUnavailable);
        require_keys_eq!(
            winner,
            ctx.accounts.claimant.key(),
            ErrorCode::InvalidWinnerAccount
        );

        let total = bet
            .creator_amount
            .checked_add(bet.accepter_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let fee = total
            .checked_mul(ctx.accounts.config.fee_bps as u64)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(ErrorCode::MathOverflow)?;

        let payout = total.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;

        bet.payout_claimed = true;

        let bet_key = ctx.accounts.bet.key();

        let signer_seeds: &[&[u8]] =
            &[ESCROW_SEED, bet_key.as_ref(), &[ctx.bumps.escrow_authority]];

        if fee > 0 {
            token::transfer(
                ctx.accounts.transfer_fee_ctx().with_signer(&[signer_seeds]),
                fee,
            )?;
        }

        token::transfer(
            ctx.accounts
                .transfer_payout_ctx()
                .with_signer(&[signer_seeds]),
            payout,
        )?;

        Ok(())
    }

    pub fn claim_void_refund(ctx: Context<ClaimVoidRefund>) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);

        let bet = &mut ctx.accounts.bet;

        require!(bet.state == BetState::Resolved, ErrorCode::InvalidBetState);
        require!(
            bet.resolution_status == ResolutionStatus::Voided,
            ErrorCode::BetNotVoided
        );

        let claimant_key = ctx.accounts.claimant.key();

        let refund_amount = if claimant_key == bet.creator {
            require!(!bet.creator_refund_claimed, ErrorCode::RefundAlreadyClaimed);
            bet.creator_refund_claimed = true;
            bet.creator_amount
        } else if claimant_key == bet.accepter {
            require!(
                bet.accepter != Pubkey::default(),
                ErrorCode::InvalidRefundClaimant
            );
            require!(
                !bet.accepter_refund_claimed,
                ErrorCode::RefundAlreadyClaimed
            );
            bet.accepter_refund_claimed = true;
            bet.accepter_amount
        } else {
            return err!(ErrorCode::InvalidRefundClaimant);
        };

        let bet_key = ctx.accounts.bet.key();

        let signer_seeds: &[&[u8]] =
            &[ESCROW_SEED, bet_key.as_ref(), &[ctx.bumps.escrow_authority]];

        token::transfer(
            ctx.accounts
                .transfer_refund_ctx()
                .with_signer(&[signer_seeds]),
            refund_amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump,
        has_one = admin @ ErrorCode::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct SetFeeVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump,
        has_one = admin @ ErrorCode::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,
    pub fee_vault: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
#[instruction(bet_id: u64)]
pub struct CreateBet<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_ata: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = creator,
        space = 8 + Bet::INIT_SPACE,
        seeds = [BET_SEED, creator.key().as_ref(), &bet_id.to_le_bytes()],
        bump,
    )]
    pub bet: Account<'info, Bet>,
    /// CHECK: PDA authority only for signing escrow token transfers.
    #[account(seeds = [ESCROW_SEED, bet.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateBet<'info> {
    fn transfer_to_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.creator_ata.to_account_info(),
                to: self.escrow_ata.to_account_info(),
                authority: self.creator.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct AcceptBet<'info> {
    #[account(mut)]
    pub accepter: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, constraint = bet.mint == mint.key() @ ErrorCode::InvalidMint)]
    pub bet: Account<'info, Bet>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = accepter,
    )]
    pub accepter_ata: Account<'info, TokenAccount>,
    /// CHECK: PDA authority only for signing escrow token transfers.
    #[account(seeds = [ESCROW_SEED, bet.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> AcceptBet<'info> {
    fn transfer_to_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.accepter_ata.to_account_info(),
                to: self.escrow_ata.to_account_info(),
                authority: self.accepter.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct CancelBet<'info> {
    #[account(mut, address = bet.creator @ ErrorCode::UnauthorizedCreator)]
    pub creator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, constraint = bet.mint == mint.key() @ ErrorCode::InvalidMint)]
    pub bet: Account<'info, Bet>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_ata: Account<'info, TokenAccount>,
    /// CHECK: PDA authority only for signing escrow token transfers.
    #[account(seeds = [ESCROW_SEED, bet.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> CancelBet<'info> {
    fn transfer_from_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.escrow_ata.to_account_info(),
                to: self.creator_ata.to_account_info(),
                authority: self.escrow_authority.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct ResolveBet<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump,
        has_one = admin @ ErrorCode::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub bet: Account<'info, Bet>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, constraint = bet.mint == mint.key() @ ErrorCode::InvalidMint)]
    pub bet: Account<'info, Bet>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = claimant,
    )]
    pub claimant_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = config.fee_vault @ ErrorCode::InvalidFeeVault,
        token::mint = mint,
    )]
    pub fee_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA authority only for signing escrow token transfers.
    #[account(seeds = [ESCROW_SEED, bet.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> ClaimWinnings<'info> {
    fn transfer_fee_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.escrow_ata.to_account_info(),
                to: self.fee_vault.to_account_info(),
                authority: self.escrow_authority.to_account_info(),
            },
        )
    }

    fn transfer_payout_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.escrow_ata.to_account_info(),
                to: self.claimant_ata.to_account_info(),
                authority: self.escrow_authority.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct ClaimVoidRefund<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, constraint = bet.mint == mint.key() @ ErrorCode::InvalidMint)]
    pub bet: Account<'info, Bet>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = claimant,
    )]
    pub claimant_ata: Account<'info, TokenAccount>,
    /// CHECK: PDA authority only for signing escrow token transfers.
    #[account(seeds = [ESCROW_SEED, bet.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow_authority,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> ClaimVoidRefund<'info> {
    fn transfer_refund_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.escrow_ata.to_account_info(),
                to: self.claimant_ata.to_account_info(),
                authority: self.escrow_authority.to_account_info(),
            },
        )
    }
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub fee_bps: u16,
    pub paused: bool,
    pub fee_vault: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketKind {
    Custom,
    CryptoPriceBinary,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PriceSymbol {
    Unknown,
    BtcUsdt,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PriceVenue {
    Unknown,
    BinanceSpot,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Comparator {
    Unknown,
    GreaterThanOrEqual,
    LessThan,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ResolutionStatus {
    Pending,
    Resolved,
    Voided,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub creator: Pubkey,
    pub accepter: Pubkey,
    pub mint: Pubkey,
    pub creator_amount: u64,
    pub accepter_amount_required: u64,
    pub accepter_amount: u64,
    pub expiry_ts: i64,
    pub state: BetState,
    pub creator_side: u8,
    pub accepter_side: u8,
    pub winner_side: u8,
    pub bet_version: u8,
    pub market_kind: MarketKind,
    pub price_symbol: PriceSymbol,
    pub price_venue: PriceVenue,
    pub settlement_minute_ts: i64,
    pub comparator: Comparator,
    pub strike_e8: u64,
    pub resolved_price_e8: u64,
    pub resolved_at_ts: i64,
    pub resolution_status: ResolutionStatus,
    pub payout_claimed: bool,
    pub creator_refund_claimed: bool,
    pub accepter_refund_claimed: bool,
    pub bet_id: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BetState {
    Open,
    Locked,
    Resolved,
    Cancelled,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Program is paused")]
    ProgramPaused,
    #[msg("Invalid fee bps")]
    InvalidFeeBps,
    #[msg("Unauthorized admin")]
    UnauthorizedAdmin,
    #[msg("Invalid side")]
    InvalidSide,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid expiry")]
    InvalidExpiry,
    #[msg("Invalid settlement minute")]
    InvalidSettlementMinute,
    #[msg("Invalid comparator")]
    InvalidComparator,
    #[msg("Invalid strike")]
    InvalidStrike,
    #[msg("Invalid bet state for this operation")]
    InvalidBetState,
    #[msg("Bet already expired")]
    BetExpired,
    #[msg("Bet has not reached expiry")]
    BetNotExpired,
    #[msg("Accepter amount must match required amount")]
    AmountMustMatchRequired,
    #[msg("Invalid odds ratio")]
    InvalidOddsRatio,
    #[msg("Bet creator cannot accept their own bet")]
    CreatorCannotAccept,
    #[msg("Bet already accepted")]
    AlreadyAccepted,
    #[msg("Unauthorized creator")]
    UnauthorizedCreator,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Winner account is invalid")]
    InvalidWinnerAccount,
    #[msg("Winner not available")]
    WinnerUnavailable,
    #[msg("Payout already claimed")]
    PayoutAlreadyClaimed,
    #[msg("Bet is not voided")]
    BetNotVoided,
    #[msg("Invalid refund claimant")]
    InvalidRefundClaimant,
    #[msg("Refund already claimed")]
    RefundAlreadyClaimed,
    #[msg("Invalid fee vault")]
    InvalidFeeVault,
    #[msg("Resolved price is invalid")]
    InvalidResolvedPrice,
    #[msg("This price market is not supported by the resolver")]
    UnsupportedPriceMarket,
    #[msg("Manual resolution is disabled for crypto price markets")]
    ManualResolveDisabledForPriceMarket,
}