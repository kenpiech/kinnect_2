// A person's ID, as the friend actions and profile pages accept it: a Clerk
// user ID (user_…), or one of kinnect's labelled bots (bot_…, see the
// labelled_bots migration). Also keeps IDs safe to put in a PostgREST filter
// string: no commas, dots or brackets.
export const PERSON_ID = /^(user_[A-Za-z0-9]+|bot_[a-z_]+)$/;
