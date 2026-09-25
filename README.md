# Loginext Fleet Tracker

A single-screen React + TypeScript dashboard for monitoring a vehicle fleet in real time. It
combines REST snapshots with WebSocket push updates to show live vehicle location, status, and
battery/fuel levels without requiring manual refreshes.

## Features

- Live fleet table with per-vehicle status, speed, location, battery, and fuel level
- Fleet-wide summary statistics (total vehicles, active/idle/offline counts, average speed)
- Filter the fleet by status
- Real-time updates via WebSocket, merged into the table as they arrive, with a live connection
  status indicator
- Vehicle detail modal (opened from a table row) showing full vehicle info, with a banner
  prompting a refresh when newer data has arrived while the modal is open

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and set `REACT_APP_API_BASE_URL` and `REACT_APP_WS_URL` to point
   at your fleet API/WebSocket server.
3. Start the dev server:
   ```
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
