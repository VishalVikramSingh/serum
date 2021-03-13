var _web = require("@solana/web3.js");

var _splToken = require("@solana/spl-token");
// console.log(_splToken.TOKEN_PROGRAM_ID)
var Transaction = _web.Transaction;
var _serum = require('@project-serum/serum');

const url = 'https://solana-api.projectserum.com';
const connection = new _web.Connection(url);

const walletAddress = new _web.PublicKey('CXHggxXTt1xpaYixLz7qFzpLNkBk8FurAam79BXJknWQ');
const tokenMintAddress = new _web.PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt');

const acct = new _web.Account();// pvt key array

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new _web.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
  var x = await _web.PublicKey.findProgramAddress([walletAddress.toBuffer(), _splToken.TOKEN_PROGRAM_ID.toBuffer(),
  tokenMintAddress.toBuffer()], SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID);
  return x[0];
}

async function signAndSendTransaction(connection,transaction,wallet,signers,skipPreflight = false,) {
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash;
  transaction.partialSign(wallet);
  // console.log(transaction);
  const rawTransaction = transaction.serialize();
  // console.log(rawTransaction)
  return await connection.sendRawTransaction(rawTransaction, {
    skipPreflight,
    preflightCommitment: 'single',
  });
}

async function createAssociatedTokenAccount(connection, wallet, splTokenMintAddress) {
  const [ix, address] = await createAssociatedTokenAccountIx(
    acct,
    wallet,
    splTokenMintAddress,
  );
  const tx = new Transaction();
  tx.add(ix);
  tx.feePayer = acct.publicKey;
  const txSig = await signAndSendTransaction(connection, tx, acct, []);

  return [address, txSig];
}

async function createAssociatedTokenAccountIx(fundingAddress, walletAddress, splTokenMintAddress) {
  const associatedTokenAddress = await findAssociatedTokenAddress(walletAddress,splTokenMintAddress);
  // const balanceNeeded = await connection.getMinimumBalanceForRentExemption(0);
  // console.log(balanceNeeded)
  const systemProgramId = new _web.PublicKey('11111111111111111111111111111111');
  const keys = [
    {
      pubkey: fundingAddress.publicKey,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: systemProgramId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: _serum.TokenInstructions.TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: _web.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  const ix = new _web.TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
  return [ix, associatedTokenAddress];
}

async function doSth(){
  var x = await createAssociatedTokenAccount(connection,walletAddress,tokenMintAddress);
  console.log(x);  
}

doSth();
