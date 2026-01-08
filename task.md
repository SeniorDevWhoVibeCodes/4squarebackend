1. We take the logic from test match and store it as durable objects, except no end date we get everything
2. We have a durable object we use for config. it stores the timestamp of the last scan, the api key for triggering a
   cron update
3. We have an endpoint on the worker that serves the entire set, cached (to file or using cloudflare). The goal is to
   minimize reads to our durable objects so maybe just write a json file that is served
4. A cloudflare cron that calls and end point every 15 minutes to update the data. Uses the timestamp so it only retrieves new data.
   * We delete any entries that are complete (aka all strikes are no longer active)
5. Vue front end allows users to browse that data. 
    * Filter on front end by date ending, date started, how many strikes (1,2,3,4-allow multiple), ending tomorrow, ending in X days
    * Search title, rules, etc. Multiple and stacking search options.
    * Ability to hide entries (stored in cookies)
    * Can click a link to open in new window
    * Can add to a "watched" list
    * any other smart filtering options.