use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("H1fMNM3LC2Ljy6auyBVzeTvE2aeG4CTDRhpm6crn5bVW");

const CONFIG_SEED: &[u8] = b"config";
const BET_SEED: &[u8] = b"bet";
const ESCROW_SEED: &[u8] = b"escrow";
const BPS_DENOMINATOR: u64 = 10_000;

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

    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_id: u64,
        creator_side: u8,
        amount: u64,
        expiry_ts: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(creator_side <= 1, ErrorCode::InvalidSide);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        require!(expiry_ts > now + min_expiry_seconds(), ErrorCode::InvalidExpiry);

        let bet = &mut ctx.accounts.bet;
        bet.creator = ctx.accounts.creator.key();
        bet.accepter = Pubkey::default();
        bet.mint = ctx.accounts.mint.key();
        bet.creator_amount = amount;
        bet.accepter_amount = 0;
        bet.expiry_ts = expiry_ts;
        bet.state = BetState::Open;
        bet.creator_side = creator_side;
        bet.accepter_side = 0;
        bet.winner_side = 0;
        bet.bet_id = bet_id;
        bet.bump = ctx.bumps.bet;

        token::transfer(ctx.accounts.transfer_to_escrow_ctx(), amount)?;
        Ok(())
    }

    pub fn accept_bet(ctx: Context<AcceptBet>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        let now = Clock::get()?.unix_timestamp;
        let bet = &mut ctx.accounts.bet;

        require!(bet.state == BetState::Open, ErrorCode::InvalidBetState);
        require!(now < bet.expiry_ts, ErrorCode::BetExpired);
        require!(amount == bet.creator_amount, ErrorCode::AmountMustMatchCreator);
        require!(ctx.accounts.accepter.key() != bet.creator, ErrorCode::CreatorCannotAccept);
        require!(bet.accepter == Pubkey::default(), ErrorCode::AlreadyAccepted);

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

    let signer_seeds: &[&[u8]] = &[
        ESCROW_SEED,
        bet_key.as_ref(),
        &[ctx.bumps.escrow_authority],
    ];

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

        require!(bet.state == BetState::Locked, ErrorCode::InvalidBetState);
        require!(now >= bet.expiry_ts, ErrorCode::BetNotExpired);

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

        let winner = if winner_side == bet.creator_side {
            bet.creator
        } else {
            bet.accepter
        };
        require!(winner != Pubkey::default(), ErrorCode::WinnerUnavailable);
        require_keys_eq!(winner, ctx.accounts.winner.key(), ErrorCode::InvalidWinnerAccount);

        bet.winner_side = winner_side;
        bet.state = BetState::Resolved;

        let bet_key = ctx.accounts.bet.key();

let signer_seeds: &[&[u8]] = &[
    ESCROW_SEED,
    bet_key.as_ref(),
    &[ctx.bumps.escrow_authority],
];

        if fee > 0 {
            token::transfer(
                ctx.accounts
                    .transfer_fee_ctx()
                    .with_signer(&[signer_seeds]),
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
    #[account(mut, constraint = bet.mint == mint.key() @ ErrorCode::InvalidMint)]
    pub bet: Account<'info, Bet>,
    pub mint: Account<'info, Mint>,
    /// CHECK: winner pubkey is checked in handler logic.
    pub winner: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = winner,
    )]
    pub winner_ata: Account<'info, TokenAccount>,
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

impl<'info> ResolveBet<'info> {
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
                to: self.winner_ata.to_account_info(),
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

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub creator: Pubkey,
    pub accepter: Pubkey,
    pub mint: Pubkey,
    pub creator_amount: u64,
    pub accepter_amount: u64,
    pub expiry_ts: i64,
    pub state: BetState,
    pub creator_side: u8,
    pub accepter_side: u8,
    pub winner_side: u8,
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
    #[msg("Invalid bet state for this operation")]
    InvalidBetState,
    #[msg("Bet already expired")]
    BetExpired,
    #[msg("Bet has not reached expiry")]
    BetNotExpired,
    #[msg("Accepter amount must match creator amount")]
    AmountMustMatchCreator,
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
    #[msg("Invalid fee vault")]
    InvalidFeeVault,
}