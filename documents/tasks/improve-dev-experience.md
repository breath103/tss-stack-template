# Improve Dev Experience

## Task 1: Add --env flag to root dev command
`npm run dev -w @app/backend` doesn't have ability to choose .env, same goes for frontend.

Make it so that on root, user can run decide env with `npm run dev -- --env=production`, this propagates for both backend and frontend to use .env.production

## Task 2: Restart backend when .env file is edited
Currently, editing .env file doesn't restart backend (frontend seems to already do it). Make it do that.

## Task 3: Wait for servers before opening browser
Currently, often `npm run dev` and edge open the url on browser, before frontend and backend server is up and ready.

Make it so that it waits for both frontend and backend to be ready and then open the browser.
