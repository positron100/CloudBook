import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import About from './components/About';
import NoteState from './context/notes/NoteState';
import Login from './components/Login';
import Signup from './components/Signup';
import Alert from './components/Alert';
import {useState} from 'react';
function App() {
  // State variable for Alert
  const [alert,setAlert]=useState({M:"",T:""});
  // Alert function
  const showAlert=(message,type)=>{
    setAlert({
     M:message,
     T:type
    })
 
    setTimeout(()=>{
     setAlert({M:"",T:""});
    },1500);
   }





  return (
    <>
      <NoteState>
        <Router>
          {/* Navbar component */}
          <Navbar />
          <Alert alert={alert}/>
          <div className="container">
            <Routes>
              <Route exact path="/" element={<Home showAlert={showAlert}/>}> </Route>
              <Route exact path="/about" element={<About />}> </Route>
              <Route exact path="/login" element={<Login  showAlert={showAlert}/>}></Route>
              <Route exact path="/signup" element={<Signup  showAlert={showAlert}/>}></Route>
            </Routes>

          </div>
        </Router>

      </NoteState>

    </>
  );
}

export default App;
