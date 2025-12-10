import React, { useState } from 'react';
import { Star, Filter, Search, SortAsc, SortDesc, CheckCircle, Eye, EyeOff, Shield, Calendar, User, MessageSquare } from 'lucide-react';
import { Provider } from '../../types';
import { formatDate } from '../../utils';
import { StarRating } from '../../StarRating';


interface ReviewsTabProps {
  provider: Provider;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ provider }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate review statistics
  const reviews = provider?.reviews || [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + parseFloat(review?.overall_rating || '0'), 0) / totalReviews 
    : 0;
  

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => {
      const matchesSearch = !searchTerm || 
        review?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review?.review_text?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a?.created_at || 0).getTime();
        const dateB = new Date(b?.created_at || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const ratingA = parseFloat(a?.overall_rating || '0');
        const ratingB = parseFloat(b?.overall_rating || '0');
        return sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA;
      }
    });

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-50';
    if (rating >= 3.5) return 'bg-yellow-50';
    if (rating >= 2.5) return 'bg-orange-50';
    return 'bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Simple Review Statistics */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <Star className="w-5 h-5 text-blue-500 mr-2" />
            Review Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalReviews}</div>
              <div className="text-sm text-gray-500">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getRatingColor(averageRating)}`}>
                {averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Search */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <Search className="w-5 h-5 text-blue-500 mr-2" />
            Search Reviews
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'rating')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="rating">Sort by Rating</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <MessageSquare className="w-5 h-5 text-blue-500 mr-2" />
            Customer Reviews ({filteredReviews.length})
          </h3>
        </div>
        <div className="p-6">
          {filteredReviews.length > 0 ? (
            <div className="space-y-6">
              {filteredReviews.map((review) => {
                const rating = parseFloat(review?.overall_rating || '0');
                return (
                  <div key={review?.id || Math.random()} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    {/* Review Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{review?.customer_name || 'Anonymous'}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {review?.created_at ? formatDate(review.created_at) : 'No date'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRatingBgColor(rating)} ${getRatingColor(rating)}`}>
                          <Star className="w-4 h-4 mr-1" />
                          {rating.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Overall Rating */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Overall Rating</span>
                        <StarRating rating={rating} />
                      </div>
                    </div>

                    {/* Review Text - Enhanced visibility */}
                    <div className="mb-4">
                      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <p className="text-gray-800 leading-relaxed text-base font-medium">
                          {review?.review_text || 'No comment provided'}
                        </p>
                      </div>
                    </div>

                    {/* Simplified Detailed Ratings - Less emphasized */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Rating Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { label: 'Punctuality', rating: parseFloat(review?.punctuality_rating || '0') },
                          { label: 'Service Quality', rating: parseFloat(review?.service_quality_rating || '0') },
                          { label: 'Communication', rating: parseFloat(review?.communication_rating || '0') },
                          { label: 'Professionalism', rating: parseFloat(review?.professionalism_rating || '0') },
                          { label: 'Value for Money', rating: parseFloat(review?.value_for_money_rating || '0') }
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{item.label}</span>
                            <div className="flex items-center">
                              <StarRating rating={item.rating} />
                              <span className="ml-2 text-xs text-gray-500">{item.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Review Status - Simplified */}
                    <div className="flex flex-wrap gap-2">
                      {review?.is_verified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      )}
                      {review?.is_public ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Eye className="w-3 h-3 mr-1" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search to see more reviews.'
                  : 'This provider has not received any reviews yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 