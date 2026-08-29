SHYAKA CUP – PLAYER LIST FIX

This fixes the case where Add Player says "Player added successfully"
but the new player does not appear in the public Players list.

Cause fixed:
- The app was hiding a Supabase player when the player number matched
  one of the original built-in 47 player records.
- Supabase records now take priority and replace the older built-in
  record with the same player number.
- The Players list and counters refresh immediately after adding.

HOW TO INSTALL
1. Extract this ZIP.
2. Upload ONLY the replacement index.html to the ROOT of the same GitHub repo.
3. Commit directly to main.
4. Wait for Vercel production deployment.
5. Refresh the live website with Ctrl + F5.
6. Open Players and test the newly added player.

No Supabase SQL is required for this fix.
