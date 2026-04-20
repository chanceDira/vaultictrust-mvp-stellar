const { Keypair } = require("@stellar/stellar-sdk");

function generateVanity(prefix) {
    let attempts = 0;
    while (true) {
        attempts++;
        const kp = Keypair.random();
        const address = kp.publicKey();
        // Stellar addresses are G[ABCD]...
        // We look for VT starting at the 3rd character
        if (address.substring(2).startsWith(prefix.toUpperCase())) {
            console.log(`Success after ${attempts} attempts!`);
            console.log(`Public Key: ${address}`);
            console.log(`Secret Key: ${kp.secret()}`);
            break;
        }
    }
}

generateVanity("VT");
