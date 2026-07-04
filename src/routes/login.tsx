import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search: {
        redirect: typeof search.redirect === "string" ? search.redirect : "/",
        tab: search.tab === "signup" ? "signup" : "login",
        email: typeof search.email === "string" ? search.email : "",
      },
    });
  },
});
