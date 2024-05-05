import React,{useContext, useState} from 'react'
import noteContext from "../context/notes/NoteContext";
const AddNote = (props) => {
    const context = useContext(noteContext);
    // eslint-disable-next-line
    const { addNote } = context;
    const [note, setNote] = useState({title:"" , description : "" , tag: "General"})
    const handleClick=(e)=>{
        e.preventDefault();
        // The preventDefault() method is a function in JavaScript that is used to stop the default behavior of an event from happening.
        // prevents from reloading the page
        addNote(note.title,note.description,note.tag);
        props.showAlert('Note Added successfully' , 'success');
    }
    const onChange=(e)=>{
        setNote({...note , [e.target.name]:e.target.value})
    }
    return (
        <>
            <div className="container my-3">
                <h2> Add a Note </h2>
            </div>
            <form className="container">
                <div className="mb-3 my-3">
                    <label htmlFor="title" className="form-label">Title</label>
                    <input type="text" className="form-control" onChange={onChange} id="title" name = "title" aria-describedby="emailHelp"/>
                    <div id="emailHelp" className="form-text">We'll never share your notes with anyone else.</div>
                </div>
                <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <input type="text" className="form-control" id="description"  onChange={onChange} name = "description"/>
                </div>
                <div className="mb-3">
                    <label htmlFor="tag" className="form-label">Tag</label>
                    <input type="text" className="form-control" id="tag"  onChange={onChange} name = "tag"/>
                </div>
                
                <button disabled={note.title.length===0 || note.description.length===0} type="submit" className="btn btn-primary" onClick={handleClick}>Add Note</button>
            </form>
        </>
    )
}

export default AddNote