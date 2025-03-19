## Aleo Setup Code Redeemer

This website decrypts redemption codes for Aleo Setup Ceremony private keys.

A modified version of snarkVM 0.7.5 was used in order for webassembly to compile. The branch can be found [here](https://github.com/monadicus/snarkVM/tree/fix-setup-wasm-build)

### Run Website with Docker

1. Clone this repo
1. Navigate to the project root `cd aleo-setup-redeem`
1. Build the container: `docker build . -t aleo-setup-redeem`
1. Run the container: `docker run --rm -p 8080:80 aleo-setup-redeem` (change `8080` to whatever port you want)
1. Open http://localhost:8080/ in your browser (change `8080` to the port from the previous step)

### Build Manually

1. Install rust
1. Install [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
1. `wasm-pack build --release --target web`
1. Optionally host the static files (requires npm): `npx http-server`
