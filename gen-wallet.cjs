const bip39 = require('bip39');
const { ethers } = require('ethers');
const bitcoin = require('bitcoinjs-lib');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');

// 初始化 BIP32 工厂 (用于比特币推导)
const bip32 = BIP32Factory(ecc);

async function generateWallets() {
    console.log("正在生成钱包，请稍候...\n");

    // --- 步骤 1: 生成随机助记词 (BIP39) ---
    // 生成 24 个单词的助记词 (256位熵)
    const mnemonic = bip39.generateMnemonic(256);
    console.log("=== 🔐 助记词 (请妥善保管) ===");
    console.log(mnemonic);
    console.log("==============================\n");

    // 将助记词转换为种子 (Seed)
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // --- 步骤 2: 生成以太坊钱包 (ETH) ---
    // 以太坊标准路径: m/44'/60'/0'/0/0
    // ethers.js v6 可以直接通过助记词生成 HD 钱包
    const ethWallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
    
    console.log("=== 🔷 Ethereum (ETH) ===");
    console.log(`地址: ${ethWallet.address}`);
    console.log(`私钥: ${ethWallet.privateKey}`);
    console.log(`路径: ${ethWallet.path}`); // 默认为 m/44'/60'/0'/0/0

    // --- 步骤 3: 生成比特币钱包 (BTC) ---
    // 我们使用 Native SegWit (bech32)，路径通常为 m/84'/0'/0'/0/0
    // 这种地址以 bc1q 开头，转账手续费更低
    
    // 3.1 从种子创建根节点
    const root = bip32.fromSeed(seed);

    // 3.2 定义路径 (BIP84 标准)
    const path = "m/84'/0'/0'/0/0";
    const child = root.derivePath(path);

    // 3.3 生成地址 (P2WPKH)
    // 需要使用 bitcoinjs-lib 将公钥转换为地址
    const { address: btcAddress } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin // 主网
    });

    console.log("\n=== 🟧 Bitcoin (BTC - Native SegWit) ===");
    console.log(`地址: ${btcAddress}`);
    // 获取 WIF (Wallet Import Format) 格式的私钥，这是比特币钱包通用的私钥格式
    console.log(`私钥 (WIF): ${child.toWIF()}`);
    console.log(`路径: ${path}`);
}

generateWallets().catch(console.error);