SHYAKA CUP — LIVE SCORES + REFEREE REPORTS UPDATE

NEW FEATURES
1. Public LIVE SCORES page.
2. Admin can change a match Status to LIVE and update the score during play.
3. Live score page also shows match events (goals, cards, substitutions, etc.).
4. Match Centre shows live scores.
5. Full Referee Reports section in Admin Centre.
6. Referee report fields include:
   - Main referee
   - Assistant referees
   - Fourth official
   - Kick-off
   - Final score
   - Yellow/red cards
   - Pitch condition
   - Team conduct
   - Incidents
   - General remarks
7. Referee reports can remain PRIVATE or be published to public Match Centre.
8. Referee report can be printed from Admin Centre.

INSTALL
A. In Supabase SQL Editor, run:
   supabase-live-scores-referee-reports.sql

B. Then upload the replacement:
   index.html
to the ROOT of the existing GitHub repository and commit to main.

C. Wait for Vercel to redeploy and refresh with Ctrl + F5.

HOW TO USE LIVE SCORES
Admin Centre > Results
- Select match
- Status = Live
- Enter current Home Score and Away Score
- Save Result
You can update it repeatedly during the match.
At full time set Status = Completed.

HOW TO USE REFEREE REPORT
Admin Centre > Referee Reports
- Select match
- Complete report
- Tick Publish only if the report should be visible publicly
- Save
