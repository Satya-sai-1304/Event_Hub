import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const ImageSlider = ({ images }) => {
  return (
    <Swiper
      spaceBetween={50}
      slidesPerView={1}
      autoplay={{ delay: 3000 }}
    >
      {images.map((image, index) => (
        <SwiperSlide key={index}>
          <img src={image} alt={`Slide ${index + 1}`} style={{ width: '100%' }} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default ImageSlider;
