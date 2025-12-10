import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTruck, 
  faMapMarkerAlt, 
  faCalendarAlt, 
  faCheckCircle, 
  faArrowRight,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

const Home: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r h-[100vh] from-blue-600 to-indigo-700 text-white py-24 px-4 sm:px-6 lg:px-8 !justify-center !items-center">
        <div className="absolute inset-0 overflow-hidden justify-center items-center">
          <img 
            src="https://images.unsplash.com/photo-1636032204208-fdd9d7b11394?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Moving van"
            className="w-full h-full object-cover opacity-20"
          />
          {/* <div className="absolute inset-20 bg-gradient-to-r from-blue-600/90 to-indigo-700/90"></div> */}
        </div>
        
        <div className="max-w-7xl !items-start !mx-auto !my-auto relative z-10 ">
          <div className="text-center  h-full !items-center !justify-center !my-auto ">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Moving Made Simple
            </motion.h1>
            <motion.p 
              className="max-w-2xl mx-auto text-lg sm:text-xl md:text-2xl mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Find reliable van operators for your move or delivery, all vetted and ready to help.
            </motion.p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <Link 
                  to="/service-request" 
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-blue-700 font-medium shadow-lg hover:bg-blue-50 transition duration-300"
                >
                  Get a Quote
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </Link>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <Link 
                  to="/login" 
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-800 bg-opacity-50 text-white font-medium border border-white border-opacity-30 hover:bg-opacity-70 transition duration-300"
                >
                  Sign In
                </Link>
              </motion.div>
            </div>
            
            {/* Trust indicators */}
            <motion.div 
              className="flex flex-wrap justify-center mt-10 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <div className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full">
                <FontAwesomeIcon icon={faShieldAlt} className="text-green-300 mr-2" />
                <span>Verified Providers</span>
              </div>
              <div className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-300 mr-2" />
                <span>Insured Moves</span>
              </div>
              <div className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-yellow-300 mr-2 font-bold">★★★★★</span>
                <span>4.8/5 Rating (15K+ Reviews)</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

  
    </div>
  );
};

export default Home;