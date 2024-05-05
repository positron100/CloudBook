import React ,{useContext} from 'react'
import noteContext from "../context/notes/NoteContext";


function NoteItem(props) {
    const context = useContext(noteContext);
    const {deleteNote} = context

    
    return (
        <div className="col-md-3">
            <div className="card my-3">
                <div className="card-body">
                    <h5 className="card-title">{props.note.title}</h5>
                    <p className="card-text">{props.note.description}</p>
                    {/* using deleteNote() from NoteState onclicking the trash icon*/}
                    <i className="fa-solid fa-trash" onClick={()=>{deleteNote(props.note._id) ; props.showAlert('Deleted successfully' , 'warning');}}></i>
                    <i className="fa-solid fa-pen-to-square mx-3" onClick={()=>{props.updatenote(props.note)}}></i>
                </div>
            </div>
        </div>
    )
}

export default NoteItem