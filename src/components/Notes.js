// component to fetch the notes
import React, { useContext, useEffect, useRef ,useState} from 'react'
import noteContext from "../context/notes/NoteContext";
import NoteItem from "./NoteItem";
import AddNote from './AddNote'
import { useNavigate } from 'react-router-dom';
function Notes(props) {
    const Navigate = useNavigate()
    const context = useContext(noteContext);
    // eslint-disable-next-line
    const { notes, getNotes , editNote} = context;
    useEffect(() => {
        if(localStorage.getItem('Token'))
        {
            getNotes()
        }
        else
        {
            props.showAlert('Please Login First' , 'info');
            Navigate('/login')
        }
        // eslint-disable-next-line
    }, [])
    // [] --> To fetch only one document 
    const ref = useRef(null);

    // state variable for an edited Note
    const [note, setNote] = useState({id: "" ,etitle:"" , edescription : "" , etag: "General"})
    // update note function
    // changing the initial value of note
    const updateNote = (currentNote) => {
        ref.current.click();
        setNote({id:currentNote._id , etitle:currentNote.title , edescription:currentNote.description , etag:currentNote.tag });
        
    }

    //  On clicking update the handleClick() would be called which would inturn call the refClose
    const refClose=useRef(null);
    // eslint-disable-next-line
    const handleClick=(e)=>{
        console.log("Updating the note ... ",note);
        // editing the note in the backend
        // providing the updated note from updateNote function
        editNote(note.id , note.etitle , note.edescription , note.etag)
        props.showAlert('Updated successfully' , 'success');
        refClose.current.click();
        e.preventDefault();
    }
    const onChange=(e)=>{
        setNote({...note , [e.target.name]:e.target.value})
    } 
    return (
        <>
            <AddNote showAlert={props.showAlert}/>
            {/* button for displaying modal */}
            <button type="button" className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#exampleModal" data-bs-whatever="@mdo"  ref={ref}>Open modal for @mdo</button>
            {/* code for Modal */}
            <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h1 className="modal-title fs-5" id="exampleModalLabel">New message</h1>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="mb-3">
                                    <label htmlFor="recipient-name" className="col-form-label">Title:</label>
                                    <input type="text" className="form-control" id="etitle" name="etitle" value={note.etitle} onChange={onChange}/>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="recipient-name" className="col-form-label">Tag:</label>
                                    <input type="text" className="form-control" id="etag" name="etag" value={note.etag} onChange={onChange}/>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="message-text" className="col-form-label">Description:</label>
                                    <textarea className="form-control" id="edescription" name="edescription" value={note.edescription} onChange={onChange}></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" ref={refClose}>Close</button>
                            <button onClick = {handleClick} type="button" className="btn btn-primary">Update</button>
                        </div>
                    </div>
                </div>
            </div>




            <div className="row my-3 mx-0">
                <h2> Your Notes </h2>
                <div className="container my-2 mx-1">
                    {notes.length===0 && 'Waiting for you to add notes ... '}
                </div>
                {notes.map((note) => {
                    return <NoteItem key={note._id} note={note} updatenote={updateNote} showAlert={props.showAlert}/>
                })}
            </div>
        </>
    )
}

export default Notes