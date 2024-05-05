import React from 'react'
const About = () => {
  return (
    <>
      <div className="container my-3 d-flex justify-content-center align-items-center">
        <div id="carouselExampleCaptions" className="carousel slide h-50 w-50">
          <div className="carousel-indicators">
            <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
            <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="1" aria-label="Slide 2"></button>
            <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="2" aria-label="Slide 3"></button>
          </div>
          <div className="carousel-inner">
            <div className="carousel-item active">
              <img src="https://img.freepik.com/free-vector/abstract-realistic-technology-particle-background_23-2148416025.jpg?w=740&t=st=1713106087~exp=1713106687~hmac=5272d7db8456d81cba1a656edb5fe12c9615edd6d4121095350dc0a815814260" alt="..." />
              <div className="carousel-caption d-none d-md-block">
                <h5>First slide label</h5>
                <p>Some representative placeholder content for the first slide.</p>
              </div>
            </div>
            <div className="carousel-item">
              <img src="https://img.freepik.com/free-vector/abstract-realistic-technology-particle-background_23-2148416026.jpg?w=740&t=st=1713105738~exp=1713106338~hmac=5f3141ab8632c7bd1cc4bd36c6e14634aabe53a63c8e9d697faecd4ce0b598a9" alt="..." />
              <div className="carousel-caption d-none d-md-block">
                <h5>Second slide label</h5>
                <p>Some representative placeholder content for the second slide.</p>
              </div>
            </div>
            <div className="carousel-item">
              <img src="https://img.freepik.com/free-photo/server-cloud-data-storage-concept-cloudscape-digital-online-service-global-network-web-database-backup-computer-infrastructure-technology_90220-1325.jpg?t=st=1713104466~exp=1713108066~hmac=fe31f577c3051620fcda42ae30ffbef9fa266f73622cc29aabda7cea55f7a71c&w=740" alt="..." />
              <div className="carousel-caption d-none d-md-block">
                <h5>Third slide label</h5>
                <p>Some representative placeholder content for the third slide.</p>
              </div>
            </div>
          </div>
          <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </div>

    </>
  )
}

export default About