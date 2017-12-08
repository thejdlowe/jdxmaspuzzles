const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');

var app = express();
var mysql = require('mysql');

app.use(express.static(path.join(__dirname, 'public')))
    .set("views", path.join(__dirname, 'views'))
    .set("view engine", "ejs")
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())
    .use(cookieParser())
    .use(function(req, res, next) {
      for (var key in req.query)
      { 
        req.query[key.toLowerCase()] = req.query[key];
      }
      next();
    })
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

  app.get("/", function(req, res) {
    var connection = mysql.createConnection(process.env.JAWSDB_URL);

    connection.connect();
    connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta;', function(err, rows, fields) {
      if (err) throw err;
      //console.dir(rows)
      res.render("pages/index", {message: "", username: req.cookies.username, total: rows[0].total, remaining: rows[0].remaining, totalMeta: rows[0].totalMeta, remainingMeta: rows[0].remainingMeta});
    });
    connection.end();
  });

  app.get("/meta", function(req, res) {
    res.render("pages/meta", {username: req.cookies.username, guesses: []});
    return;
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    
    connection.connect();
    connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta;', function(err, rows, fields) {
      if (err) throw err;
      //console.dir(rows)
      res.render("pages/meta", {message: "", username: req.cookies.username, total: rows[0].total, remaining: rows[0].remaining, totalMeta: rows[0].totalMeta, remainingMeta: rows[0].remainingMeta});
    });
    connection.end();
  });

(function() {
  var connection = mysql.createConnection(process.env.JAWSDB_URL);

  connection.connect();

  connection.query('SELECT * from puzzles;', function(err, rows, fields) {
    if (err) throw err;

    //console.log('The solution is: ', rows[0].solution);
    rows.forEach(function(row) {
      var name = row.name;
      var partial = "../partials/" + row.partialname + ".ejs";
      var title = row.title;
      app.get("/" + name, function(req, res) {
        var username = req.cookies.username;
        if(!username) username = "";
        var connection = mysql.createConnection(process.env.JAWSDB_URL);
        connection.connect();
        connection.query('SELECT  * FROM guesses where puzzlename = ? ORDER BY `timestamp` DESC', [name], function(err, rowsTop, fields) {
          res.render("pages/puzzle", {partial: partial, name: name, title: title, message: "", username: username, guesses: rowsTop});
        });
        connection.end();
      });

      app.post("/" + name, function(req, res) {
        var answer = req.body.answer;
        if(!answer) answer="";
        var username = req.cookies.username;
        if(!username) username = "";

        answer = JSON.stringify(answer).replace(/[^a-z]/gi, '').toUpperCase();

        //username = JSON.stringify(username).replace(/[^a-z]/gi, '');

        var connection = mysql.createConnection(process.env.JAWSDB_URL);
        connection.connect();
        connection.query('SELECT COUNT(*) as count from puzzles where name = ? and answer = ?;', [name, answer], function(err, rowsTop, fields) {
          var connection = mysql.createConnection(process.env.JAWSDB_URL);

          connection.connect();

          connection.query('INSERT INTO guesses SET ?', {puzzlename: name, player: username, didsolve: rowsTop[0].count == 1, guess: answer}, function(err, rows, fields) {
            res.redirect("/" + name);
          });
          
          connection.end();

          //res.render("pages/puzzle", {partial: partial, name: name, title: title, message: rowsTop[0].count == 1, username: username});
        });

        connection.end();
      });
    });
  });

  connection.end();
})();

app.get("/random", function(req, res) {
  var connection = mysql.createConnection(process.env.JAWSDB_URL);

  connection.connect();

  connection.query('SELECT * from puzzles WHERE issolved = 0 ORDER BY RAND() LIMIT 1;', function(err, rows, fields) {
    if (err) throw err;
    console.log(rows.length)
    if(rows.length) {
      res.redirect("/" + rows[0].name);
    }
    else {
      res.sendStatus(404);
    }
  });

  connection.end();
});