const Sequelize = require("sequelize");
var sqlite3 = require('sqlite3');
var sqlite = require("sqlite");

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./test.db",
    logging: false
});

const tbUser = sequelize.define(
    "TUsers", {
        username: {
            type: Sequelize.STRING(50),
            allowNull: false
        }
    }, {
        timestamps: false,
        paranoid: true
    }
);

function serialize(db, cb) {
    return new Promise((resolve, reject) => {
        db.getDatabaseInstance().serialize(() => {
            cb(db.getDatabaseInstance()).then(resolve).catch(reject);
        });
    });
}

const pragmas = ['journal_mode = WAL', 'synchronous = NORMAL'];

sequelize
    .sync({
        force: true
    })
    .then(async () => {
        for (const p of pragmas) {
            await sequelize.query("pragma " + p);
        }
        var timestamp = Date.now();
        for (var i = 0; i < 1000; i++) {
            await tbUser.create({
                username: "hello,world"
            });
        }
        console.log("sequelize-----", Date.now() - timestamp);
    })
    .then(async () => {
        var timestamp = Date.now();
        await sequelize.transaction(async (t) => {
            for (var i = 0; i < 1000; i++) {
                await tbUser.create({
                    username: "hello,world"
                }, {
                    transaction: t
                });
            }
        })
        console.log("sequelize transaction-----", Date.now() - timestamp);
    })
    .then(async () => {
        var sqlitedb = await sqlite.open({filename: "test.db", driver: sqlite3.Database});

        for (const p of pragmas) {
            await sqlitedb.run("pragma " + p);
        }
        var timestamp = Date.now();
        for (var i = 0; i < 1000; i++) {
            const r = await sqlitedb.run(
                "insert into TUsers('username') values('hello,world')"
            );
        }
        console.log("sqlite3-----", Date.now() - timestamp);
    })
    .then(async () => {
        var db = await sqlite.open({filename: "test.db", driver: sqlite3.Database});
        for (const p of pragmas) {
            await db.run("pragma " + p);
        }

        var timestamp = Date.now();
        serialize(db, async (x) => {
            for (var i = 0; i < 1000; i++) {
                x.run("insert into TUsers('username') values('hello,world')");
            }
        });
        console.log("sqlite3 transaction-----", Date.now() - timestamp);
    }).then( ()=> {
        const Database = require('better-sqlite3');
        const db = new Database('test.db');
        for (const p of pragmas) {
            db.exec("pragma " + p);
        }
        const stmt = db.prepare("insert into TUsers('username') VALUES (?)");
        var timestamp = Date.now();
        for (var i = 0; i < 1000; i++) {
            stmt.run('hello,world2');
        }
        console.log("better-sqlite3-----", Date.now() - timestamp);
    }).then(()=> {
        const Database = require('better-sqlite3');
        const db = new Database('test.db');
        for (const p of pragmas) {
            db.exec("pragma " + p);
        }
        const stmt = db.prepare("insert into TUsers('username') VALUES (?)");
        var timestamp = Date.now();
        const trans= db.transaction(() => {
            for (var i = 0; i < 1000; i++) {
                stmt.run('hello,world4');
            }
        });
        trans();
        console.log("better-sqlite3 transaction-----", Date.now() - timestamp);
    });