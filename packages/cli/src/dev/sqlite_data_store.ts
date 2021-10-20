import Database = require("better-sqlite3")
import * as fs from "fs"
import { DataStore, CollectionStore, Runtime } from "@fly/core"
import log from "@fly/core/lib/log"
import * as path from "path"

export class Collection implements CollectionStore {
  public name: string
  public db: Database.Database

  constructor(db: Database.Database, name: string) {
    this.db = db
    this.name = name
  }

  public put(rt: Runtime, key: string, obj: string) {
    try {
      const info = this.db.prepare(`INSERT OR REPLACE INTO ${this.name} VALUES (?, ?)`).run(key, obj)
      return Promise.resolve(info.changes > 0)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public get(rt: Runtime, key: string) {
    try {
      const data = this.db.prepare(`SELECT obj FROM ${this.name} WHERE key == ?`).get(key)
      return Promise.resolve(data)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public del(rt: Runtime, key: string) {
    try {
      const info = this.db.prepare(`DELETE FROM ${this.name} WHERE key == ?`).run(key)
      return Promise.resolve(info.changes > 0)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export class SQLiteDataStore implements DataStore {
  public db: Database.Database
  constructor(appName: string, env: string) {
    // FIXME: use correct cwd, for now: using default.
    fs.mkdirSync(path.join(".fly", "data"), { recursive: true })
    appName = appName.split(path.sep).join("-") // useful in our own testing environment
    this.db = new Database(path.join(".fly", "data", `${appName}-${env}.db`))
  }

  public collection(rt: Runtime, name: string) {
    log.debug("creating coll (table) name:", name)
    try {
      this.db.prepare(`CREATE TABLE IF NOT EXISTS ${name} (key TEXT PRIMARY KEY NOT NULL, obj JSON NOT NULL)`).run()
      return Promise.resolve(new Collection(this.db, name))
    } catch (err) {
      log.error("error creating coll:", err)
      return Promise.reject(err)
    }
  }

  public dropCollection(rt: Runtime, name: string) {
    log.debug("drop coll", name)
    try {
      this.db.prepare(`DROP TABLE IF EXISTS ${name}`).run()
      return Promise.resolve()
    } catch (err) {
      log.error("error creating coll:", err)
      return Promise.reject(err)
    }
  }
}
