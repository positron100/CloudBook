import Notes from "./Notes";
import type { ShowAlert } from "@/types/alert";

const Home = ({ showAlert }: { showAlert: ShowAlert }) => {
  return <Notes showAlert={showAlert} />;
};

export default Home;
