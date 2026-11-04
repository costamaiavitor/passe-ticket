<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All backend calls go through src/services/http.ts (VITE_API_URL + /api/v1); mocks live only in src/mocks and are used when VITE_API_URL is unset — keeps mocks out of real service logic.
- Security rules (CPF limits, payment approval, QR validity, stock) are display-only in the frontend; the external Node backend is authoritative.
