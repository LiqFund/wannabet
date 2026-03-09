const anchor = require("@coral-xyz/anchor");
const { expect } = require("chai");
const {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

describe("wannabet_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WannabetEscrow;
  const payer = provider.wallet;

  let mint;
  let feeVault;
  let configPda;
  let creator;
  let accepter;
  let creatorAta;
  let accepterAta;

  async function createFundedUser(amountUi) {
    const user = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");

    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      ata.address,
      payer.payer,
      amountUi * 1_000_000
    );

    return { user, ata: ata.address };
  }

  async function fetchTokenAmount(address) {
    const account = await getAccount(provider.connection, address);
    return Number(account.amount);
  }

  before(async () => {
    mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6
    );

    feeVault = await createAccount(
      provider.connection,
      payer.payer,
      mint,
      payer.publicKey
    );

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    creator = await createFundedUser(20);
    accepter = await createFundedUser(20);
    creatorAta = creator.ata;
    accepterAta = accepter.ata;
  });

  it("initializes config", async () => {
    await program.methods
      .initializeConfig(0, feeVault)
      .accounts({
        payer: payer.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    expect(config.admin.toBase58()).to.equal(payer.publicKey.toBase58());
    expect(config.feeBps).to.equal(0);
    expect(config.paused).to.equal(false);
    expect(config.feeVault.toBase58()).to.equal(feeVault.toBase58());
  });

  it("creates a bet and moves funds into escrow", async () => {
    const betId = new anchor.BN(1);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const beforeCreator = await fetchTokenAmount(creatorAta);
    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    const afterCreator = await fetchTokenAmount(creatorAta);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(bet.creator.toBase58()).to.equal(creator.user.publicKey.toBase58());
    expect(bet.accepter.toBase58()).to.equal(anchor.web3.PublicKey.default.toBase58());
    expect(Number(bet.creatorAmount)).to.equal(1_000_000);
    expect(Number(bet.accepterAmountRequired)).to.equal(1_000_000);
    expect(Number(bet.accepterAmount)).to.equal(0);
    expect(Object.keys(bet.state)[0]).to.equal("open");
    expect(afterCreator).to.equal(beforeCreator - 1_000_000);
    expect(escrowBalance).to.equal(1_000_000);
  });

  it("accepts a bet and moves accepter funds into escrow", async () => {
    const betId = new anchor.BN(2);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    const beforeAccepter = await fetchTokenAmount(accepterAta);

    await program.methods
      .acceptBet(new anchor.BN(1_000_000))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    const afterAccepter = await fetchTokenAmount(accepterAta);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(bet.accepter.toBase58()).to.equal(accepter.user.publicKey.toBase58());
    expect(Number(bet.accepterAmountRequired)).to.equal(1_000_000);
    expect(Number(bet.accepterAmount)).to.equal(1_000_000);
    expect(Object.keys(bet.state)[0]).to.equal("locked");
    expect(afterAccepter).to.equal(beforeAccepter - 1_000_000);
    expect(escrowBalance).to.equal(2_000_000);
  });

  it("cancels an open bet and returns creator funds", async () => {
    const betId = new anchor.BN(3);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    const beforeCreator = await fetchTokenAmount(creatorAta);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    const afterCreateCreator = await fetchTokenAmount(creatorAta);
    expect(afterCreateCreator).to.equal(beforeCreator - 1_000_000);

    await program.methods
      .cancelBet()
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        creatorAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([creator.user])
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    const afterCancelCreator = await fetchTokenAmount(creatorAta);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("cancelled");
    expect(afterCancelCreator).to.equal(beforeCreator);
    expect(escrowBalance).to.equal(0);
  });

  it("resolves a locked bet and sends 2 percent fee to fee vault", async () => {
    const feeBps = 200;
    const betId = new anchor.BN(4);

    await program.methods
      .setFeeBps(feeBps)
      .accounts({
        admin: payer.publicKey,
        config: configPda,
      })
      .rpc();

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    const expiryTs = now + 65;

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(expiryTs)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    await program.methods
      .acceptBet(new anchor.BN(1_000_000))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    const winnerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      creator.user.publicKey
    );

    const beforeWinner = await fetchTokenAmount(winnerAta.address);
    const beforeFeeVault = await fetchTokenAmount(feeVault);

    await new Promise((resolve) => setTimeout(resolve, 70000));

    await program.methods
      .resolveBet(0)
      .accounts({
        admin: payer.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        winner: creator.user.publicKey,
        winnerAta: winnerAta.address,
        feeVault,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    const afterWinner = await fetchTokenAmount(winnerAta.address);
    const afterFeeVault = await fetchTokenAmount(feeVault);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("resolved");
    expect(Number(bet.winnerSide)).to.equal(0);
    expect(afterWinner - beforeWinner).to.equal(1_960_000);
    expect(afterFeeVault - beforeFeeVault).to.equal(40_000);
    expect(escrowBalance).to.equal(0);
  });

  it("rejects creator accepting their own bet", async () => {
    const betId = new anchor.BN(5);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    let failed = false;

    try {
      await program.methods
        .acceptBet(new anchor.BN(1_000_000))
        .accounts({
          accepter: creator.user.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          accepterAta: creatorAta,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("CreatorCannotAccept");
    }

    expect(failed).to.equal(true);
  });

  it("rejects accepting with the wrong amount", async () => {
    const betId = new anchor.BN(6);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    let failed = false;

    try {
      await program.methods
        .acceptBet(new anchor.BN(500_000))
        .accounts({
          accepter: accepter.user.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          accepterAta,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([accepter.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("AmountMustMatchRequired");
    }

    expect(failed).to.equal(true);

    const bet = await program.account.bet.fetch(betPda);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("open");
    expect(Number(bet.accepterAmount)).to.equal(0);
    expect(escrowBalance).to.equal(1_000_000);
  });

  it("rejects non creator cancelling a bet", async () => {
    const betId = new anchor.BN(7);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    let failed = false;

    try {
      await program.methods
        .cancelBet()
        .accounts({
          creator: accepter.user.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          creatorAta: accepterAta,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([accepter.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("UnauthorizedCreator");
    }

    expect(failed).to.equal(true);

    const bet = await program.account.bet.fetch(betPda);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("open");
    expect(escrowBalance).to.equal(1_000_000);
  });

  it("rejects resolving before expiry", async () => {
    const feeBps = 200;
    const betId = new anchor.BN(8);

    await program.methods
      .setFeeBps(feeBps)
      .accounts({
        admin: payer.publicKey,
        config: configPda,
      })
      .rpc();

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    const expiryTs = now + 120;

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(expiryTs)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    await program.methods
      .acceptBet(new anchor.BN(1_000_000))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    const winnerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      creator.user.publicKey
    );

    let failed = false;

    try {
      await program.methods
        .resolveBet(0)
        .accounts({
          admin: payer.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          winner: creator.user.publicKey,
          winnerAta: winnerAta.address,
          feeVault,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("BetNotExpired");
    }

    expect(failed).to.equal(true);

    const bet = await program.account.bet.fetch(betPda);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("locked");
    expect(escrowBalance).to.equal(2_000_000);
  });

  it("rejects creator cancelling a locked bet", async () => {
    const betId = new anchor.BN(9);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    await program.methods
      .acceptBet(new anchor.BN(1_000_000))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    let failed = false;

    try {
      await program.methods
        .cancelBet()
        .accounts({
          creator: creator.user.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          creatorAta,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("InvalidBetState");
    }

    expect(failed).to.equal(true);

    const bet = await program.account.bet.fetch(betPda);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("locked");
    expect(escrowBalance).to.equal(2_000_000);
  });

  it("rejects non admin resolving a locked bet", async () => {
    const feeBps = 200;
    const betId = new anchor.BN(10);

    await program.methods
      .setFeeBps(feeBps)
      .accounts({
        admin: payer.publicKey,
        config: configPda,
      })
      .rpc();

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    const expiryTs = now + 65;

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(expiryTs)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    await program.methods
      .acceptBet(new anchor.BN(1_000_000))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    const winnerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      creator.user.publicKey
    );

    await new Promise((resolve) => setTimeout(resolve, 70000));

    let failed = false;

    try {
      await program.methods
        .resolveBet(0)
        .accounts({
          admin: accepter.user.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          winner: creator.user.publicKey,
          winnerAta: winnerAta.address,
          feeVault,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([accepter.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("UnauthorizedAdmin");
    }

    expect(failed).to.equal(true);

    const bet = await program.account.bet.fetch(betPda);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("locked");
    expect(escrowBalance).to.equal(2_000_000);
  });

  it("rejects resolving the same bet twice", async () => {
    const feeBps = 200;
    const betId = new anchor.BN(11);

    await program.methods
      .setFeeBps(feeBps)
      .accounts({
        admin: payer.publicKey,
        config: configPda,
      })
      .rpc();

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    const expiryTs = now + 65;

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(1_000_000),
        new anchor.BN(1_000_000),
        new anchor.BN(expiryTs)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    await program.methods
      .acceptBet(new anchor.BN(1_000_000))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    const winnerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      creator.user.publicKey
    );

    await new Promise((resolve) => setTimeout(resolve, 70000));

    await program.methods
      .resolveBet(0)
      .accounts({
        admin: payer.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        winner: creator.user.publicKey,
        winnerAta: winnerAta.address,
        feeVault,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    let failed = false;

    try {
      await program.methods
        .resolveBet(0)
        .accounts({
          admin: payer.publicKey,
          config: configPda,
          bet: betPda,
          mint,
          winner: creator.user.publicKey,
          winnerAta: winnerAta.address,
          feeVault,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("InvalidBetState");
    }

    expect(failed).to.equal(true);

    const bet = await program.account.bet.fetch(betPda);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Object.keys(bet.state)[0]).to.equal("resolved");
    expect(escrowBalance).to.equal(0);
  });

  it("creates and accepts a custom unequal stake bet", async () => {
    const betId = new anchor.BN(12);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const creatorStake = 1_000_000;
    const accepterStake = 5_000_000;
    const now = Math.floor(Date.now() / 1000);

    const beforeCreator = await fetchTokenAmount(creatorAta);
    const beforeAccepter = await fetchTokenAmount(accepterAta);

    await program.methods
      .createBet(
        betId,
        0,
        new anchor.BN(creatorStake),
        new anchor.BN(accepterStake),
        new anchor.BN(now + 120)
      )
      .accounts({
        creator: creator.user.publicKey,
        config: configPda,
        mint,
        creatorAta,
        bet: betPda,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator.user])
      .rpc();

    const midCreator = await fetchTokenAmount(creatorAta);
    expect(midCreator).to.equal(beforeCreator - creatorStake);

    await program.methods
      .acceptBet(new anchor.BN(accepterStake))
      .accounts({
        accepter: accepter.user.publicKey,
        config: configPda,
        bet: betPda,
        mint,
        accepterAta,
        escrowAuthority,
        escrowAta: escrowAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([accepter.user])
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    const afterAccepter = await fetchTokenAmount(accepterAta);
    const escrowBalance = await fetchTokenAmount(escrowAta.address);

    expect(Number(bet.creatorAmount)).to.equal(creatorStake);
    expect(Number(bet.accepterAmountRequired)).to.equal(accepterStake);
    expect(Number(bet.accepterAmount)).to.equal(accepterStake);
    expect(Object.keys(bet.state)[0]).to.equal("locked");
    expect(afterAccepter).to.equal(beforeAccepter - accepterStake);
    expect(escrowBalance).to.equal(creatorStake + accepterStake);
  });

  it("rejects invalid odds ratio above 100 to 1", async () => {
    const betId = new anchor.BN(13);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    let failed = false;

    try {
      await program.methods
        .createBet(
          betId,
          0,
          new anchor.BN(1_000_000),
          new anchor.BN(101_000_000),
          new anchor.BN(now + 120)
        )
        .accounts({
          creator: creator.user.publicKey,
          config: configPda,
          mint,
          creatorAta,
          bet: betPda,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("InvalidOddsRatio");
    }

    expect(failed).to.equal(true);
  });

  it("rejects invalid odds ratio above 100 to 1 in the reverse direction", async () => {
    const betId = new anchor.BN(14);

    const [betPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        creator.user.publicKey.toBuffer(),
        betId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), betPda.toBuffer()],
      program.programId
    );

    const escrowAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      escrowAuthority,
      true
    );

    const now = Math.floor(Date.now() / 1000);
    let failed = false;

    try {
      await program.methods
        .createBet(
          betId,
          0,
          new anchor.BN(101_000_000),
          new anchor.BN(1_000_000),
          new anchor.BN(now + 120)
        )
        .accounts({
          creator: creator.user.publicKey,
          config: configPda,
          mint,
          creatorAta,
          bet: betPda,
          escrowAuthority,
          escrowAta: escrowAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator.user])
        .rpc();
    } catch (err) {
      failed = true;
      expect(String(err)).to.include("InvalidOddsRatio");
    }

    expect(failed).to.equal(true);
  });
});