'use client';

import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';

interface ProductCardProps {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
}

export default function ProductCard({ id, name, price, image, category }: ProductCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <Link to={`/products/${id}`}>
                <div className="relative h-48 w-full overflow-hidden">
                    <img src={image} alt={name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
            </Link>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
                        <p className="text-sm text-gray-500">{category}</p>
                    </div>
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <FontAwesomeIcon icon={faHeart} className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex justify-between items-center mt-4">
                    <span className="text-xl font-bold text-[#dc711a]">${price}</span>
                    <button className="bg-[#dc711a] text-white px-4 py-2 rounded-full text-sm hover:bg-[#dc711a]/90 transition-colors">Add to Cart</button>
                </div>
            </div>
        </div>
    );
}
