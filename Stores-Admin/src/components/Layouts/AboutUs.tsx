import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const AboutUs = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const leaders = [
        {
            name: 'Ellis Armah Ayikwei',
            role: 'CEO & Founder',
            image: '/assets/images/team/ellis.jpg',
            bio: 'With over 10 years in tech, Ellis leads TradeHut with a vision to revolutionize technology services in Ghana. His expertise in software development and business strategy drives our innovation.',
            expertise: ['Software Development', 'Business Strategy', 'Tech Innovation'],
            social: {
                linkedin: 'https://www.linkedin.com/in/ellis-armah-ayikwei-4a817b192/',
                twitter: 'https://twitter.com/EllisAyikwei',
            },
        },
        // {
        //     name: 'Samuel Mensah',
        //     role: 'Technical Director',
        //     image: '/src/assets/images/team/samuel.jpg',
        //     bio: 'Samuel brings 8+ years of hardware expertise, leading our repair and maintenance division. His commitment to quality ensures top-tier service delivery.',
        //     expertise: ['Hardware Repair', 'Quality Assurance', 'Team Leadership'],
        //     social: {
        //         linkedin: 'https://linkedin.com/in/samuel-mensah',
        //     },
        // },
        // {
        //     name: 'Grace Addo',
        //     role: 'Operations Manager',
        //     image: '/src/assets/images/team/grace.jpg',
        //     bio: 'Grace oversees daily operations with 6 years of experience in operations management. Her focus on efficiency and customer satisfaction drives our service excellence.',
        //     expertise: ['Operations Management', 'Customer Relations', 'Process Optimization'],
        //     social: {
        //         linkedin: 'https://linkedin.com/in/grace-addo',
        //     },
        // },
    ];

    return (
        <section id="about" className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-transparent" />
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-orange-50/30 to-transparent" /> */}

            <div className="container mx-auto px-4 max-w-6xl relative">
                {/* Enhanced Section Header with Story */}
                <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeInUp} className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        About <span className="text-[#dc711a]">TradeHut</span>
                    </h2>
                    <p className="text-gray-600 max-w-3xl mx-auto mb-8">
                        Founded in 2018, TradeHut emerged from a vision to bridge the technology gap in Ghana. What started as a small repair shop has grown into a comprehensive technology solutions
                        provider, serving hundreds of satisfied customers across the country.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
                        <div className="bg-orange-50/50 p-6 rounded-xl">
                            <h4 className="font-semibold text-[#dc711a] mb-2">5+ Years</h4>
                            <p className="text-sm text-gray-600">Of Excellence in Tech Solutions</p>
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-xl">
                            <h4 className="font-semibold text-[#dc711a] mb-2">1000+</h4>
                            <p className="text-sm text-gray-600">Satisfied Customers</p>
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-xl">
                            <h4 className="font-semibold text-[#dc711a] mb-2">98%</h4>
                            <p className="text-sm text-gray-600">Customer Satisfaction Rate</p>
                        </div>
                    </div>
                </motion.div>

                {/* Mission & Vision */}
                <div className="grid md:grid-cols-2 gap-8 mb-20">
                    <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-bullseye text-[#dc711a] text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Our Mission</h3>
                        <p className="text-gray-600">
                            To provide cutting-edge technology solutions and exceptional service that empowers businesses and individuals to achieve their digital goals while ensuring reliability,
                            innovation, and customer satisfaction.
                        </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-eye text-[#dc711a] text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Our Vision</h3>
                        <p className="text-gray-600">
                            To become Ghana's leading technology solutions provider, recognized for our excellence, innovation, and commitment to transforming how businesses and individuals interact
                            with technology.
                        </p>
                    </motion.div>
                </div>

                {/* Core Values */}
                <motion.div variants={fadeInUp} className="mb-20">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Core Values</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: 'medal', title: 'Excellence', desc: 'Striving for the highest quality in everything we do' },
                            { icon: 'heart', title: 'Integrity', desc: 'Maintaining honest and ethical business practices' },
                            { icon: 'users', title: 'Teamwork', desc: 'Collaborating to achieve exceptional results' },
                            { icon: 'lightbulb', title: 'Innovation', desc: 'Embracing new technologies and solutions' },
                        ].map((value, index) => (
                            <motion.div key={index} variants={fadeInUp} className="text-center p-6 rounded-xl hover:bg-orange-50/50 transition-colors">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className={`fas fa-${value.icon} text-[#dc711a]`}></i>
                                </div>
                                <h4 className="font-semibold text-gray-900 mb-2">{value.title}</h4>
                                <p className="text-sm text-gray-600">{value.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Enhanced Team Section */}
                <motion.div variants={fadeInUp} className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Leadership Team</h3>
                    <p className="text-gray-600 max-w-2xl mx-auto mb-12">
                        Meet the dedicated professionals who drive our vision forward, bringing together decades of combined experience in technology and business management.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {leaders.map((leader, index) => (
                            <motion.div key={index} variants={fadeInUp} className="relative group">
                                <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                                    <div className="relative">
                                        <img src={leader.image} alt={leader.name} className="w-full aspect-square object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                                <div className="flex gap-4 justify-center">
                                                    {leader.social.linkedin && (
                                                        <a href={leader.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#dc711a] transition-colors">
                                                            <i className="fab fa-linkedin text-xl"></i>
                                                        </a>
                                                    )}
                                                    {leader.social.twitter && (
                                                        <a href={leader.social.twitter} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#dc711a] transition-colors">
                                                            <i className="fab fa-twitter text-xl"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="text-xl font-bold text-gray-900 mb-1">{leader.name}</h4>
                                        <p className="text-[#dc711a] font-medium mb-4">{leader.role}</p>
                                        <p className="text-gray-600 text-sm mb-4">{leader.bio}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {leader.expertise.map((skill, idx) => (
                                                <span key={idx} className="px-3 py-1 text-xs font-medium bg-orange-100/50 text-[#dc711a] rounded-full">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* New Achievement Section */}
                <motion.div variants={fadeInUp} className="mt-20 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-12">Our Journey</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { year: '2018', title: 'Founded', desc: 'Started as a mobile repair shop' },
                            { year: '2020', title: 'Expansion', desc: 'Added IT support services' },
                            { year: '2021', title: 'Growth', desc: 'Launched web development division' },
                            { year: '2023', title: 'Innovation', desc: 'Introduced remote support solutions' },
                        ].map((milestone, index) => (
                            <motion.div key={index} variants={fadeInUp} className="relative p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#dc711a] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {milestone.year.slice(2)}
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mt-2 mb-2">{milestone.title}</h4>
                                <p className="text-sm text-gray-600">{milestone.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default AboutUs;
