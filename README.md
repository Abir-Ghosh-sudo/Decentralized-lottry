# 🎰 Decentralized Lottery on Stellar (Soroban)

## 📖 Project Description

This project is a **Decentralized Lottery Smart Contract** built using **Soroban on the Stellar network**. It enables users to participate in a transparent, trustless lottery system without relying on any centralized authority.

Participants can enter the lottery, and an admin can securely select a winner. All data is stored on-chain, ensuring fairness and transparency.

---

## 🚀 What It Does

* Allows users to enter a decentralized lottery
* Stores participants securely on-chain
* Enables an admin to pick a winner
* Resets the lottery after each round

---

## ✨ Features

* 🔐 **Secure & Trustless** — No central authority controls the system
* 📦 **On-chain Storage** — All participants are recorded on the blockchain
* 🧑‍⚖️ **Admin Verification** — Only authorized admin can pick a winner
* 🔄 **Automatic Reset** — New round starts after winner selection
* ⚡ **Built with Soroban** — Fast and efficient smart contracts on Stellar

---

## 🛠️ Tech Stack

* **Rust**
* **Soroban SDK**
* **Stellar Blockchain**

---

## 📂 Project Structure

```
contracts/
 └── contract/
     ├── Cargo.toml
     └── src/
         └── lib.rs
```

---

## ⚙️ How to Build

```bash
stellar contract build
```

---

## 🧪 How to Use

1. Deploy the contract
2. Initialize with admin address:

   * `init(admin)`
3. Enter lottery:

   * `enter(user)`
4. View participants:

   * `get_players()`
5. Pick winner (admin only):

   * `pick_winner()`

---

## 🔗 Deployed Smart Contract

👉 **Contract Link:** XXX

---

## ⚠️ Important Notes

* Winner selection is currently **not random** (for demo purposes)
* Not suitable for production without:

  * Secure randomness
  * Token/XLM entry fees
  * Prize distribution logic

---


<img width="1869" height="850" alt="image" src="https://github.com/user-attachments/assets/88757fa3-99d5-4a37-9d1e-f21c76756aab" />

contract adress : CCYKJU3MEGEV2V7M4Z2PE2RPZGBVREJVA47PBEW6HYEPZRH4VVOPPREJ

## 🚀 Future Improvements

* 🎲 Verifiable randomness (oracle integration)
* 💰 Entry fee (XLM or tokens)
* 🏆 Automatic prize distribution
* 🌐 Frontend UI (React + Stellar wallet)
* 📊 Analytics dashboard

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo and submit pull requests.

---

## 📜 License

MIT License
