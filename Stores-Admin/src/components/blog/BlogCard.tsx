import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faUser, faClock, faBookmark, faShare } from '@fortawesome/free-solid-svg-icons';

interface BlogCardProps {
    post: {
        id: number;
        title: string;
        excerpt: string;
        author: string;
        date: string;
        category: string;
        image: string;
        readTime: string;
        tags: string[];
    };
}

const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
            <Link to={`/blog/${post.id}`} className="block">
                <div className="relative overflow-hidden">
                    <motion.img src={post.image} alt={post.title} className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-primary text-white text-sm rounded-full shadow-lg">{post.category}</span>
                    </div>
                    <div className="absolute top-4 right-4 flex space-x-2">
                        <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faBookmark} />
                        </button>
                        <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faShare} />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <span className="flex items-center">
                            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                            {new Date(post.date).toLocaleDateString()}
                        </span>
                        <span className="mx-3">•</span>
                        <span className="flex items-center">
                            <FontAwesomeIcon icon={faUser} className="mr-2" />
                            {post.author}
                        </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>

                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{post.excerpt}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <span className="flex items-center text-sm text-primary">
                            <FontAwesomeIcon icon={faClock} className="mr-2" />
                            {post.readTime}
                        </span>
                        <span className="text-primary font-medium group-hover:translate-x-2 transition-transform">Read More</span>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
};

export default BlogCard;
