# Jiwe Web3 Wallet API (Celo Camp 2022 Submission)

## Description

This repository contains [Jiwe Interactive's](https://jiwe.studio) celo camp batch 5 submission. 

It is a Web3 enabled wallet API that enables game developers to add in-app purchases and rewards.

## Get Started

Clone the repo and install the dependencies

```sh
npm install
```

### Get started

```sh
npm run dev
```

This runs `Jiwe Wallet` in development mode making it available on http://localhost:2021.
v1 of the api rests on `{HOST}/api/v1/`

## Folder structure

```sh
├── README.md (this file)
├── node_modules
├── package.json
├── package-lock.json
├── .gitignore
├── .eslintrc.js
├── .prettierrc
└── src
    ├── controllers         # Controllers group related request handling logic talking to the store where needed
    ├── routes              # The routes directory contains all of the route definitions for Jiwe Wallet.
    ├── utils               # Useful functions
    ├── router.js
    └── server.js           # Where Web3 Wallet begins
```

## Tests

TBD

```sh
npm test
```

