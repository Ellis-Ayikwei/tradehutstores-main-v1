'use client';

const Returns = () => {
    return (
        <div className="max-w-screen-xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Returns Policy</h1>
            <p>
                If you are not completely satisfied with your purchase, you may return it within 30 days for a full refund. To be eligible for a return, your item must be unused and in the same
                condition that you received it.
            </p>
            <h2 className="font-semibold mt-4">How to Return an Item:</h2>
            <ol className="list-decimal ml-6">
                <li>Contact our customer service to initiate a return.</li>
                <li>Pack the item securely in its original packaging.</li>
                <li>Ship the item back to us using the provided return label.</li>
            </ol>
        </div>
    );
};

export default Returns;
