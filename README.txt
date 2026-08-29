SHYAKA CUP ADMIN SECURITY UPDATE

1. In Supabase SQL Editor run admin-security-lockdown.sql once.
2. In GitHub upload the new index.html to the repository root, replacing the current index.html.
3. Commit to main and allow Vercel to redeploy.
4. Public users will no longer see Admin or Add Player buttons.
5. Admins open the private login by adding ?admin=1 to the end of the normal website address.
   Example: https://YOUR-DOMAIN.vercel.app/?admin=1
6. Only accounts listed in public.admins can enter the Admin Centre.
