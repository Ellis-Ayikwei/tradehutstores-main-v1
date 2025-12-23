import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faUser, faTag, faClock, faShare, faBookmark } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faTwitter, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { Link } from 'react-router-dom';

interface BlogPostProps {
    post: {
        id: number;
        title: string;
        content: string;
        author: string;
        date: string;
        category: string;
        image: string;
        readTime: string;
        tags?: string[];
    };
}

const BlogPost: React.FC<BlogPostProps> = ({ post }) => {
    return (
        <article className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <Link to="/blog" className="inline-flex items-center text-primary hover:text-primary-dark transition-colors">
                        <FontAwesomeIcon icon={faTag} className="mr-2" />
                        {post.category}
                    </Link>
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors" aria-label="Bookmark article">
                            <FontAwesomeIcon icon={faBookmark} className="text-xl" />
                        </button>
                        <button className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors" aria-label="Share article">
                            <FontAwesomeIcon icon={faShare} className="text-xl" />
                        </button>
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">{post.title}</h1>

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-8">
                    <span className="flex items-center">
                        <FontAwesomeIcon icon={faUser} className="mr-2" />
                        {post.author}
                    </span>
                    <span className="flex items-center">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                        {new Date(post.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                        <FontAwesomeIcon icon={faClock} className="mr-2" />
                        {post.readTime}
                    </span>
                </div>

                {/* Featured Image */}
                <div className="relative rounded-xl overflow-hidden mb-8">
                    <motion.img src={post.image} alt={post.title} className="w-full h-[400px] object-cover" initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
            </motion.div>

            {/* Content */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="prose prose-lg dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </motion.div>

            {/* Tags */}
            {post.tags && (
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Topics</h3>
                    <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                            <Link
                                key={tag}
                                to={`/blog?tag=${tag}`}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-primary hover:text-white dark:hover:bg-primary transition-colors"
                            >
                                {tag}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Share Section */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Share this article</h3>
                <div className="flex space-x-4">
                    <button className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors" aria-label="Share on Facebook">
                        <FontAwesomeIcon icon={faFacebook} />
                    </button>
                    <button className="p-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors" aria-label="Share on Twitter">
                        <FontAwesomeIcon icon={faTwitter} />
                    </button>
                    <button className="p-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors" aria-label="Share on LinkedIn">
                        <FontAwesomeIcon icon={faLinkedin} />
                    </button>
                </div>
            </div>

            {/* Author Bio */}
            <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center">
                    <img src={`https://ui-avatars.com/api/?name=${post.author}&background=random`} alt={post.author} className="w-16 h-16 rounded-full mr-4" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{post.author}</h3>
                        <p className="text-gray-600 dark:text-gray-400">Moving expert with over 10 years of experience in the industry.</p>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default BlogPost;
