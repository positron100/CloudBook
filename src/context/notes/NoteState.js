import { useState } from 'react';
import NoteContext from './NoteContext';
// import { useState } from 'react';
const NoteState = (props) =>{
  const host = "http://localhost:5000";
    // state to be passed Globally
  const [notes, setNotes] = useState([])
  
  
  // Get all Notes 
  const getNotes =async ()=>{
    // API call
    // eslint-disable-next-line
    const response = await fetch(`${host}/api/notes/fetchallnotes` , {
      method: 'GET',   
      headers:{
        "Content-Type" : 'application/json',
        "auth-token" : localStorage.getItem('Token')
      },
    });
    const json = await response.json()
    setNotes(json)
  }

  
  
  
  
  
  
  
  
  // Add a Note 
  const addNote = async (title,description,tag)=>{
    // API call
    
    const response = await fetch(`${host}/api/notes/addnote/` , {
      method: 'POST',   
      headers:{
        "Content-Type" : 'application/json',
        "auth-token" : localStorage.getItem('Token')
      },
      body:JSON.stringify({title,description,tag})
    });
    const note = await response.json();
    // returns the note (in json format) object to console
    console.log(note);

    // logic to add a note in client 
    console.log("Adding a new note")
    
    setNotes(notes.concat(note))

  }

  // Delete a Note
  const deleteNote =async (id)=>{
      // API call
        const response = await fetch(`${host}/api/notes/deletenote/${id}` , {
        method: 'DELETE',   
        headers:{
          "Content-Type" : 'application/json',
          "auth-token" : localStorage.getItem('Token')
        },
      })  ;
      // eslint-disable-next-line
      const json = await response.json();
      console.log(json)

    // Logic to Delete in client
    console.log("deleteNote function called "+id)
    const newNote = notes.filter((note)=>{return note._id!==id})
    setNotes(newNote);
  }

  // Edit a Note

  const editNote = async(id,title,description,tag)=>{
    // API call
      const response = await fetch(`${host}/api/notes/updatenote/${id}` , {
      method: 'PUT',   
      headers:{
        "Content-Type" : 'application/json',
        "auth-token" : localStorage.getItem('Token')
      },
      body: JSON.stringify({title,description,tag})
    });
    const json = await response.json();
    console.log(json);
    
    // deep copy of notes
    // returning array of all the notes
    let newNotes = JSON.parse(JSON.stringify(notes));
    // Logic to edit in client
    for (let index = 0; index < newNotes.length; index++) {
      const element = newNotes[index];
      if(element._id===id)
      {
        newNotes[index].title = title;
        newNotes[index].description = description;
        newNotes[index].tag = tag; 
        break;
      }
    }
    setNotes(newNotes);
  }
    return(
        <NoteContext.Provider value={{notes,addNote,deleteNote,editNote,getNotes}}>
            {props.children}  
        </NoteContext.Provider>
    )
}

export default NoteState ;


// to use the contextAPI : wrap whole react app components into NoteState