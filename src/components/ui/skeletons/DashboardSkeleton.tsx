const DashboardSkeleton: React.FC = () => {
   return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
         {/* Main Content */}
         <main>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4 pb-2">

               {/* Ad Carousel Skeleton */}
               <section className="mb-4">
                  <div className="w-full aspect-[21/9] md:aspect-[3/1] bg-gray-200 rounded-xl md:rounded-2xl shadow-sm" />
               </section>


               {/* Special Offer Banner Skeleton - Matched to "Weekend Deal" */}
               <section className="mb-4">
                  <div className="h-24 md:h-32 bg-gray-200 rounded-xl md:rounded-2xl shadow-md relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 opacity-50" />
                     <div className="p-3 md:p-6 flex items-center justify-between h-full">
                        <div className="space-y-2 w-1/2">
                           <div className="h-6 w-3/4 bg-gray-300 rounded" />
                           <div className="h-4 w-1/2 bg-gray-300 rounded" />
                        </div>
                        <div className="h-10 w-24 bg-gray-300 rounded-lg" />
                     </div>
                  </div>
               </section>

               {/* Spotlight Businesses Skeleton */}
               <section className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                     <div className="h-6 w-40 bg-gray-200 rounded" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                     {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 pl-12 flex items-center gap-4 relative ml-4 min-h-[100px]">
                           {/* Avatar */}
                           <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gray-200 border-4 border-white shadow-lg" />

                           {/* Content */}
                           <div className="flex-1 pl-2 space-y-2">
                              <div className="h-5 w-3/4 bg-gray-200 rounded" />
                              <div className="h-4 w-1/2 bg-gray-200 rounded" />
                              <div className="flex gap-4 mt-2">
                                 <div className="h-4 w-16 bg-gray-200 rounded" />
                                 <div className="h-4 w-16 bg-gray-200 rounded" />
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </section>

               {/* Hot Offers Skeleton - Ticket Style */}
               <section className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                     <div className="h-6 w-32 bg-gray-200 rounded" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex h-28 w-full rounded-xl overflow-hidden shadow-sm filter drop-shadow-sm">
                           {/* Left Stub */}
                           <div className="w-[18%] bg-gray-300 relative">
                              <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-gray-50 rounded-full" />
                           </div>
                           {/* Right Content */}
                           <div className="flex-1 bg-white border border-gray-200 border-l-0 relative">
                              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-gray-50 rounded-full z-10" />
                              <div className="p-3 flex items-center h-full">
                                 <div className="flex-1 space-y-3 pl-4">
                                    <div className="h-3 w-20 bg-gray-200 rounded" />
                                    <div className="h-5 w-3/4 bg-gray-200 rounded" />
                                    <div className="h-3 w-1/3 bg-gray-200 rounded" />
                                 </div>
                                 {/* Barcode Strip Placeholder */}
                                 <div className="w-[30%] h-full border-l border-dashed border-gray-200" />
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </section>

               {/* New Businesses Skeleton */}
               <section className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                     <div className="h-6 w-40 bg-gray-200 rounded" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                     {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-white rounded-lg border border-gray-200" />
                     ))}
                  </div>
               </section>


               {/* Trending Products Skeleton */}
               <section className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                     <div className="h-6 w-40 bg-gray-200 rounded" />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-2 mb-2">
                     {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="aspect-[9/16] bg-gray-200 rounded-xl md:rounded-2xl" />
                     ))}
                  </div>
               </section>

            </div>
         </main>

         {/* Bottom Navigation Skeleton (if needed, but usually persistent) */}
      </div>
   );
};

export default DashboardSkeleton;
