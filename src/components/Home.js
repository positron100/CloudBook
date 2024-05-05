// rafce : react arrow function export component
import React from 'react'
import Notes from './Notes'
const Home = (props) => {
  
  return (
    <>

      {/* Notes Component */}

      <Notes showAlert={props.showAlert}/>
      
    </>
  )
}

export default Home