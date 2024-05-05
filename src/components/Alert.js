import React from 'react'

export default function Alert(props) {
    return (
        <>
            <div className="container" style={{ height: '50px' }}>

                <div className={`alert alert-${props.alert.T} alert-dismissible fade show`} role="alert">
                    {props.alert.M}
                    {/* <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button> */}
                </div>
            </div>

        </>
    )
}