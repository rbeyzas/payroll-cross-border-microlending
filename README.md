# Algorand-dApp-Quick-Start-Template-TypeScript

This is a full-stack starter template for quickly building and testing Web3 ideas on Algorand. It includes:

- Wallet connection
- Send ALGO payments
- NFT minting (IPFS metadata via Pinata)
- Token (ASA) creation
- Smart contract interaction demo

Use this template to kickstart your project, prototype ideas, and showcase a working proof-of-concept.

## 🌟 How To Get Started Instructions

### **Fork the Repo:**

To create your own copy of this repository:

a. **Go to the GitHub Repository:**

- Navigate to the main page which is the current one your on.

b. **Click the "Fork" Button:**

- In the top-right corner of the page, click the **Fork** button. This will create a copy of the repository under your GitHub account. Feel free to hit the ⭐️ aswell so you can find the Algorand-dApp-Quick-Start-Template-Typescript repo easily!

c. **Wait for the Forking Process to Complete:**

- GitHub will take a few moments to create the fork. Once complete, you’ll be redirected to your newly created fork.

https://github.com/user-attachments/assets/92e746e1-3143-4769-8a5a-1339e4bd7a14

## 🚀 Start with Codespaces

This is the fastest way to get up and running!

1. **Create a Codespace:**

   - Click the green "Code" button at the top right of your forked repo.
   - Select "Create codespace on main".
   - Once your Codespace is fully loaded, you are ready to go!

Make sure to wait for algokit to be installed automatically - it should only take a few mins max!

2. **While in Codespace:**

   - Enter the workspace
     <img width="2794" height="1524" alt="image" src="https://github.com/user-attachments/assets/41f25490-1284-4998-b342-27f7a0ffb420" />

3. **Give it a testrun!:** (WIP)
   - Click on run & debug
   - Run and deploy the hello world smart contract
   - And then run dApp - check out what is already given to you. Or simply `npm run dev` in the CLI!
     <img width="1528" height="808" alt="image" src="https://github.com/user-attachments/assets/2f337d67-02e2-4b0c-8244-109951269b5e" />

**Pro Tip:** GitHub Codespaces is included with free accounts but comes with a monthly limit of 60 hours.

To avoid losing your progress, be sure to **commit your changes regularly** — just like shown in the video demo below — so your updates are saved to your forked repository.

https://github.com/user-attachments/assets/dd452ea1-3070-4718-af34-bea978e208ab

## For Local Devs:

If `npm run dev` doesn’t work, run: `npm install --save-dev @algorandfoundation/algokit-client-generator`

And create your `.env` file by copying from the `.env.template`

## Project Structure Simplified

- `projects/QuickStartTemplate-frontend/src/` — Frontend code (The webpage)
- `projects/QuickStartTemplate-frontend/src/App.tsx` — Main app layout and routing
- `projects/QuickStartTemplate-frontend/src/components/Transact.tsx` — Simple transfer ALGO logic (Provided to you thanks to AlgoKit)
- `projects/QuickStartTemplate-frontend/src/components/NFTmint.tsx` — Simple NFT minting interface
- `projects/QuickStartTemplate-frontend/src/components/Tokenmint.tsx` — Simple token (ASA) minting interface
- `projects/QuickStartTemplate-frontend/src/components/AppCalls.tsx` — Smart contract interaction demo
- `projects/QuickStartTemplate-contracts/smart_contracts/hello_world/contract.algo.ts` — Example TypeScript smart contract

## Reference Guide

Need more help? See the Algorand-dApp-Quick-Start-Template Reference Guide for step-by-step instructions, AI prompts, and troubleshooting tips:

[View the guide](https://docs.google.com/document/d/1f_ysbtFOLKM_Tjvey7VCcGYsAzOmyEVmsdC5si936wc/edit?usp=sharing)

# payroll-cross-border-microlending

# QuickStartTemplate

This starter full stack project has been generated using AlgoKit. See below for default getting started instructions.

## Setup

### Initial setup

1. Clone this repository to your local machine.
2. Ensure [Docker](https://www.docker.com/) is installed and operational. Then, install `AlgoKit` following this [guide](https://github.com/algorandfoundation/algokit-cli#install).
3. Run `algokit project bootstrap all` in the project directory. This command sets up your environment by installing necessary dependencies, setting up a Python virtual environment, and preparing your `.env` file.
4. In the case of a smart contract project, execute `algokit generate env-file -a target_network localnet` from the `QuickStartTemplate-contracts` directory to create a `.env.localnet` file with default configuration for `localnet`.
5. To build your project, execute `algokit project run build`. This compiles your project and prepares it for running.
6. For project-specific instructions, refer to the READMEs of the child projects:
   - Smart Contracts: [QuickStartTemplate-contracts](projects/QuickStartTemplate-contracts/README.md)
   - Frontend Application: [QuickStartTemplate-frontend](projects/QuickStartTemplate-frontend/README.md)

> This project is structured as a monorepo, refer to the [documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) to learn more about custom command orchestration via `algokit project run`.

### Subsequently

1. If you update to the latest source code and there are new dependencies, you will need to run `algokit project bootstrap all` again.
2. Follow step 3 above.

### Continuous Integration / Continuous Deployment (CI/CD)

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI/CD workflows, which are located in the [`.github/workflows`](./.github/workflows) folder. You can configure these actions to suit your project's needs, including CI checks, audits, linting, type checking, testing, and deployments to TestNet.

For pushes to `main` branch, after the above checks pass, the following deployment actions are performed:

- The smart contract(s) are deployed to TestNet using [AlgoNode](https://algonode.io).
- The frontend application is deployed to a provider of your choice (Netlify, Vercel, etc.). See [frontend README](frontend/README.md) for more information.

> Please note deployment of smart contracts is done via `algokit deploy` command which can be invoked both via CI as seen on this project, or locally. For more information on how to use `algokit deploy` please see [AlgoKit documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/deploy.md).

## Tools

This project makes use of Python and React to build Algorand smart contracts and to provide a base project configuration to develop frontends for your Algorand dApps and interactions with smart contracts. The following tools are in use:

- Algorand, AlgoKit, and AlgoKit Utils
- Python dependencies including Poetry, Black, Ruff or Flake8, mypy, pytest, and pip-audit
- React and related dependencies including AlgoKit Utils, Tailwind CSS, daisyUI, use-wallet, npm, jest, playwright, Prettier, ESLint, and Github Actions workflows for build validation

### VS Code

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [backend .vscode](./backend/.vscode) and [frontend .vscode](./frontend/.vscode) folders for more details.

## Integrating with smart contracts and application clients

Refer to the [QuickStartTemplate-contracts](projects/QuickStartTemplate-contracts/README.md) folder for overview of working with smart contracts, [projects/QuickStartTemplate-frontend](projects/QuickStartTemplate-frontend/README.md) for overview of the React project and the [projects/QuickStartTemplate-frontend/contracts](projects/QuickStartTemplate-frontend/src/contracts/README.md) folder for README on adding new smart contracts from backend as application clients on your frontend. The templates provided in these folders will help you get started.
When you compile and generate smart contract artifacts, your frontend component will automatically generate typescript application clients from smart contract artifacts and move them to `frontend/src/contracts` folder, see [`generate:app-clients` in package.json](projects/QuickStartTemplate-frontend/package.json). Afterwards, you are free to import and use them in your frontend application.

The frontend starter also provides an example of interactions with your HelloWorldClient in [`AppCalls.tsx`](projects/QuickStartTemplate-frontend/src/components/AppCalls.tsx) component by default.

## Next Steps

You can take this project and customize it to build your own decentralized applications on Algorand. Make sure to understand how to use AlgoKit and how to write smart contracts for Algorand before you start.
# payroll-cross-border-microlending
