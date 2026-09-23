import { useEffect } from "react";
import { useNavigate } from "react-router";

/** Placeholder so the legacy main.tsx route compiles before we rewire it. */
export default function Dashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/restaurant/dashboard", { replace: true });
  }, [navigate]);
  return null;
}
