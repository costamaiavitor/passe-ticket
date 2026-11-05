# Passe Ticket

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1843fd3a-7bfa-4fcc-8e04-c1f2d4958458).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend

A API fica em [`backend/`](backend/README.md) (Node + SQLite). Para usar o site com ela, rode o backend e
defina `VITE_API_URL=http://localhost:3333` em `.env.local`. Sem `VITE_API_URL` o site roda em modo demonstração (dados simulados no navegador).
