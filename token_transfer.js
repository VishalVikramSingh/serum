const BufferLayout = require('buffer-layout');
const solanaWeb3 = require('@solana/web3.js');
var _splToken = require("@solana/spl-token");
var SystemProgram = solanaWeb3.SystemProgram;
var Transaction = solanaWeb3.Transaction;
var Account = solanaWeb3.Account;

// const url = 'https://api.mainnet-beta.solana.com/';
const url = 'https://solana-api.projectserum.com';
const connection = new solanaWeb3.Connection(url);

const wallet = new solanaWeb3.Account(); // my pvt key array
const destination = new solanaWeb3.PublicKey('F986gUyhVkeqDw5Vvr9526vXGkoNW4AZpx4BGoptH6zn'); // srm associated token address of the receiver
const tokenMintAddress = new solanaWeb3.PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt');
const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const amount = 1000000; // 9 decimal places (0.001)

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    BufferLayout.u8('decimals'),
    BufferLayout.blob(32, 'mintAuthority'),
    BufferLayout.u8('freezeAuthorityOption'),
    BufferLayout.blob(32, 'freezeAuthority'),
  ]),
  'initializeMint',
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
  3,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'transfer',
);
LAYOUT.addVariant(
  7,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'mintTo',
);
LAYOUT.addVariant(
  8,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'burn',
);
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span),
);

async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
  var x = await solanaWeb3.PublicKey.findProgramAddress([walletAddress.toBuffer(), _splToken.TOKEN_PROGRAM_ID.toBuffer(),
  tokenMintAddress.toBuffer()], SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID);
  // console.log(x[0].toString())
  return x[0].toString;
}

function encodeTokenInstructionData(instruction) {
  let b = Buffer.alloc(instructionMaxSpan);
  let span = LAYOUT.encode(instruction, b);
  console.log("here")
  return b.slice(0, span);
}

function transfer(source, destination, amount, owner) {
  let keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new solanaWeb3.TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      transfer: { amount },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

function createTransferBetweenSplTokenAccountsInstruction(ownerPublicKey, sourcePublicKey, destinationPublicKey, amount, memo) {
  let transaction = new Transaction().add(
    transfer({
      source: sourcePublicKey,
      destination: destinationPublicKey,
      amount,
      owner: ownerPublicKey,
    }),
  );
  transaction.feePayer = wallet.publicKey;
  if (memo) {
    transaction.add(memoInstruction(memo));
  }
  return transaction;
}

async function transferBetweenSplTokenAccounts(connection, owner, sourcePublicKey, destinationPublicKey, amount, memo) {
  const transaction = createTransferBetweenSplTokenAccountsInstruction({
    ownerPublicKey: owner.publicKey,
    sourcePublicKey,
    destinationPublicKey,
    amount,
    memo,
  });
  let signers = [];
  return await signAndSendTransaction(connection, transaction, owner, signers);
}

async function signAndSendTransaction(connection,transaction,wallet,signers,skipPreflight = false,) {
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash;

  transaction.partialSign(wallet);
  const rawTransaction = transaction.serialize();
  return await connection.sendRawTransaction(rawTransaction, {
    skipPreflight,
    preflightCommitment: 'single',
  });
}

transferBetweenSplTokenAccounts(connection, wallet, wallet.publicKey, destination, amount, "memo");
