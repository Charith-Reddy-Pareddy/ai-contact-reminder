import * as fileStore from "./fileStore.js";
import * as pgStore from "./pgStore.js";

const backend = process.env.DATABASE_URL ? pgStore : fileStore;

export const readContacts = backend.readContacts;
export const writeContacts = backend.writeContacts;
