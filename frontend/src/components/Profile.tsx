import { useAuth } from "@/context/AuthContext";

// Interim profile view — redesigned in the UI/UX overhaul. Data comes from the
// existing POST /api/auth/getuser call that AuthContext already makes.
export default function Profile() {
  const { user, status } = useAuth();

  if (status === "loading") return <p className="my-3">Loading…</p>;
  if (!user) return <p className="my-3">Could not load your profile.</p>;

  return (
    <div className="my-3">
      <h2>User Profile</h2>
      <p className="mb-1">
        <strong>Name:</strong> {user.name}
      </p>
      <p className="mb-1">
        <strong>Email:</strong> {user.email}
      </p>
      <p className="mb-1">
        <strong>User id:</strong> {user._id}
      </p>
      {user.date && (
        <p className="mb-1">
          <strong>Joined:</strong> {new Date(user.date).toUTCString()}
        </p>
      )}
    </div>
  );
}
