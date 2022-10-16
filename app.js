const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const operations = require("./operations");


var accountValues = Array(3);
app.use(bodyParser.json());
// Wrapper for a transaction.  This automatically re-calls the operation with
// the client as an argument as long as the database server asks for
// the transaction to be retried.
async function retryTxn(n, max, client, operation, callback) {
  const backoffInterval = 100; // millis
  const maxTries = 5;
  let tries = 0;

  while (true) {
    await client.query('BEGIN;');

    tries++;

    try {
      const result = await operation(client, callback);
      await client.query('COMMIT;');
      return result;
    } catch (err) {
      await client.query('ROLLBACK;');

      if (err.code !== '40001' || tries == maxTries) {
        throw err;
      } else {
        console.log('Transaction failed. Retrying.');
        console.log(err.message);
        await new Promise(r => setTimeout(r, tries * backoffInterval));
      }
    }
  }
}

// This function is called within the first transaction. It inserts some initial values into the "accounts" table.
async function initTable(client, callback) {
  let i = 0;
  while (i < accountValues.length) {
    accountValues[i] = await uuidv4();
    i++;
  }

  const insertStatement =
    "INSERT INTO accounts (id, balance) VALUES ($1, 1000), ($2, 250), ($3, 0);";
  await client.query(insertStatement, accountValues, callback);

  const selectBalanceStatement = "SELECT id, balance FROM accounts;";
  await client.query(selectBalanceStatement, callback);
}

// This function updates the values of two rows, simulating a "transfer" of funds.
async function transferFunds(client, callback) {
  const from = accountValues[0];
  const to = accountValues[1];
  const amount = 100;
  const selectFromBalanceStatement =
    "SELECT balance FROM accounts WHERE id = $1;";
  const selectFromValues = [from];
  await client.query(
    selectFromBalanceStatement,
    selectFromValues,
    (err, res) => {
      if (err) {
        return callback(err);
      } else if (res.rows.length === 0) {
        console.log("account not found in table");
        return callback(err);
      }
      var acctBal = res.rows[0].balance;
      if (acctBal < amount) {
        return callback(new Error("insufficient funds"));
      }
    }
  );

  const updateFromBalanceStatement =
    "UPDATE accounts SET balance = balance - $1 WHERE id = $2;";
  const updateFromValues = [amount, from];
  await client.query(updateFromBalanceStatement, updateFromValues, callback);

  const updateToBalanceStatement =
    "UPDATE accounts SET balance = balance + $1 WHERE id = $2;";
  const updateToValues = [amount, to];
  await client.query(updateToBalanceStatement, updateToValues, callback);

  const selectBalanceStatement = "SELECT id, balance FROM accounts;";
  await client.query(selectBalanceStatement, callback);
}

// This function deletes the third row in the accounts table.
async function deleteAccounts(client, callback) {
  const deleteStatement = "DELETE FROM accounts WHERE id = $1;";
  await client.query(deleteStatement, [accountValues[2]], callback);

  const selectBalanceStatement = "SELECT id, balance FROM accounts;";
  await client.query(selectBalanceStatement, callback);
}

// Run the transactions in the connection pool
// (async () => {
async function run() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    application_name: "$ docs_simplecrud_node-postgres",
  });

  // Connect to database
  const client = await pool.connect();
  const selectBalanceStatement = "SELECT id, balance FROM accounts;";
  await client.query(selectBalanceStatement, callback);
  // Callback
  function cb(err, res) {
    if (err) throw err;

    if (res.rows.length > 0) {
      console.log("New account balances:");
      res.rows.forEach((row) => {
        console.log(row);
      });
    }
  }

  // Initialize table in transaction retry wrapper
  console.log("Initializing accounts table...");
  await retryTxn(0, 15, client, initTable, cb);

  // Transfer funds in transaction retry wrapper
  console.log("Transferring funds...");
  await retryTxn(0, 15, client, transferFunds, cb);

  // Delete a row in transaction retry wrapper
  console.log("Deleting a row...");
  await retryTxn(0, 15, client, deleteAccounts, cb);

  console.log("Adding ranch...");
  // await operations.addRanch(client, cb, "Ranch 1", "https://ranch1.com", "Ranch 1 fdasfdasfdis a ranch", "https://ranch1.com/img.png");
  // Exit program

  // process.exit();
}
// run().catch((err) => console.log(err.stack));
const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    application_name: "$ docs_simplecrud_node-postgres",
  });
let client;
  // Connect to database
async function init() {
  client = await pool.connect();
}
init();




app.get('/ranch/random', async (request, response) => {
  function cb(err, res) {
    if (err) {
      console.log(err);
      response.status(500).send(err);
    } else {
      response.json(res);
    }
  }

  operations.getRandomRanch(client, cb);
})

app.post('/ranch', (request, response) => {
    let body = request.body
    function cb(err, res) {
      if (err) {
        console.log(err);
        response.status(500).send(err);
      } else {
        response.json(body);
      }
    }
    // log type of body
    operations.addRanch(client, cb, body.name, body.url, body.about, body.imgUrl);
})

app.put('/ranch/match', (request, response) => {
  let body = request.body
  function cb(err, res) {
    if (err) {
      console.log(err);
      response.status(500).send(err);
    } else {
      response.json(res);
    }
  }
  // log type of body
  operations.updateElo(client, cb, body.winner, body.loser);
});


const PORT = 3030
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
