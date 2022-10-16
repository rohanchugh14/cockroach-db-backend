async function addRanch(client, callback, name, url, about, imgUrl) {
    let values = [name, url, about, imgUrl];

  
    const insertStatement =
      "INSERT INTO ranch (name, url, about, imgUrl) VALUES ($1, $2, $3, $4) RETURNING id;";
    await client.query(insertStatement, values, (err, res) => {
      if(err) return callback(err);
      let id = res.rows[0].id;
      client.query("INSERT INTO elo (ranchID, elo, wins, losses) VALUES ($1, 500, 0, 0)", [id], (err, res) => {
        if (err) return callback(err);
        callback(err, res);
      });
      
    });
   
    
    // const selectBalanceStatement = "SELECT id, name, url, about, imgUrl FROM ranch;";
    // await client.query(selectBalanceStatement, callback);
  }

  async function getRandomRanch(client, callback) {
    const selectBalanceStatement = "SELECT * FROM ranch;";
    await client.query(selectBalanceStatement, async(err, res) => {
      if(err) return callback(err);
      let randomIndex = Math.floor(Math.random() * res.rows.length);
      let randomRanch = res.rows[randomIndex];
      await client.query("SELECT * FROM elo WHERE ranchID = $1", [randomRanch.id], (err, res) => {
        if(err) return callback(err);
        callback(err, {ranch: randomRanch, elo: res.rows[0]});
      });
      // callback(err, res.rows[randomIndex]);
    });
  }

  async function updateElo(client, callback, winner, loser) {
    let winnerIncrement;
    let loserIncrement;
    let difference = Math.abs(winner.elo.elo - loser.elo.elo);
    if(difference === 0) {
      difference = 1;
    }
      if(winner.elo.elo > loser.elo.elo ) {
        winnerIncrement = 20 - Math.min(2 *( Math.log(difference) / Math.log(5)), 10);
        loserIncrement = winnerIncrement;
      } else {
        winnerIncrement = 20 + Math.min(2 *( Math.log(difference) / Math.log(5)), 15);
        loserIncrement = Math.min(winnerIncrement, 24);
      }
    
    //Add a random number between 0 and 5 inclusive to winnerIncrement and loserIncrement
    winnerIncrement += Math.floor(Math.random() * 4);
    loserIncrement -= Math.floor(Math.random() * 3);
    winnerIncrement = Math.round(winnerIncrement);
    loserIncrement = Math.round(loserIncrement);
    console.log(winnerIncrement, loserIncrement);
    const updateWinnerStatement = "UPDATE elo SET elo = elo + $1, wins = wins + 1 WHERE ranchID = $2";
    const winnerStatementData = [winnerIncrement, winner.ranch.id];
    const updateLoserStatement = "UPDATE elo SET elo = elo - $1, losses = losses + 1 WHERE ranchID = $2";
    const loserStatementData = [loserIncrement, loser.ranch.id];

    await client.query(updateWinnerStatement, winnerStatementData, async(err, res) => {
      if(err) return callback(err);
      await client.query(updateLoserStatement, loserStatementData, (err, res) => {
        if(err) return callback(err);
        winner.elo.elo = parseInt(winner.elo.elo) + winnerIncrement;
        loser.elo.elo = parseInt(loser.elo.elo) - loserIncrement;
        winner.elo.wins = parseInt(winner.elo.wins) + 1;
        loser.elo.losses = parseInt(loser.elo.losses) + 1;
        callback(err, {winner: winner, loser: loser});
      });
    });

  }
  module.exports = { addRanch, getRandomRanch, updateElo };