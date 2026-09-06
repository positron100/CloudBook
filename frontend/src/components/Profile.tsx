import { Surface } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import "./Profile.css";

export default function Profile() {
  const { user, status } = useAuth();

  return (
    <Reveal as="div" onView={false} className="profile">
      <h1 className="profile__title">Profile</h1>
      <Surface level={2} className="profile__card" data-intro-target="profile">
        {status === "loading" && <p className="profile__muted">Loading…</p>}
        {status !== "loading" && !user && <p className="profile__muted">Could not load your profile.</p>}
        {user && (
          <dl className="profile__list">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>User id</dt>
              <dd className="profile__mono">{user._id}</dd>
            </div>
            {user.date && (
              <div>
                <dt>Joined</dt>
                <dd>{new Date(user.date).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        )}
      </Surface>
    </Reveal>
  );
}
