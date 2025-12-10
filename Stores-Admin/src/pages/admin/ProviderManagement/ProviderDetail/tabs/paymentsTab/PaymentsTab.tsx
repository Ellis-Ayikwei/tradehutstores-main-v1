import React from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard
} from 'lucide-react';
import { formatDate, getStatusBadgeClass } from '../../utils';


interface PaymentsTabProps {
  provider: Provider;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ provider }) => {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <DollarSign className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Payment History</h3>
        </div>
        <Link
          to={`/admin/providers/${provider.id}/payments`}
          className="text-blue-600 hover:text-blue-900 text-sm"
        >
          View All Payments
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {provider.paymentHistory && provider.paymentHistory.length > 0 ? (
              provider.paymentHistory.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{payment.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{formatDate(payment.date)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {payment.type === 'payment' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500 mr-2" />
                      ) : payment.type === 'refund' ? (
                        <ArrowDownLeft className="w-4 h-4 text-red-500 mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <div className="text-sm text-gray-900 capitalize">{payment.type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                      <div className={`text-sm font-medium ${
                        payment.type === 'payment' ? 'text-green-600' :
                        payment.type === 'refund' ? 'text-red-600' :
                        'text-gray-900'
                      }`}>
                        ${payment.amount.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/payments/${payment.id}`}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No payment history found for this provider.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 