'use client';
import { Navigation } from '@/components/Navigation';
import { MapPin, Phone, Globe, Search, X } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CampusResource {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  phone?: string;
  website?: string;
  category: string;
}

export default function ResourcesPage() {
    const [searchTerm, setSearchTerm] = useState('');

  // Sample UGA campus resources - can be replaced with API call
  const resources: CampusResource[] = [
    {
      id: '1',
      name: 'Tate Student Center',
      description: 'Multipurpose student center with dining, meeting spaces, and recreational facilities.',
      image: '/images/resources/facilities.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-9000',
      website: 'https://tate.uga.edu',
      category: 'Facilities',
    },
    {
      id: '2',
      name: 'Ramsey Student Center',
      description: 'Student hub featuring dining options, meeting rooms, and student organization spaces.',
      image: '/images/resources/facilities.svg',
      location: 'North Campus',
      phone: '(706) 542-9100',
      website: 'https://ramsey.uga.edu',
      category: 'Facilities',
    },
    {
      id: '3',
      name: 'University Health Center',
      description: 'Comprehensive healthcare services for students including medical, mental health, and wellness.',
      image: '/images/resources/health.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-1441',
      website: 'https://www.uhs.uga.edu',
      category: 'Health',
    },
    {
      id: '4',
      name: 'Zell B. Miller Learning Center',
      description: 'Tutoring, writing support, and academic skills development for all UGA students.',
      image: '/images/resources/academic.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-8105',
      website: 'https://irc.uga.edu',
      category: 'Academic',
    },
    {
      id: '5',
      name: 'Counseling and Psychological Services',
      description: 'Mental health support including individual counseling, group therapy, and crisis services.',
      image: '/images/resources/health.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-2273',
      website: 'https://www.caps.uga.edu',
      category: 'Health',
    },
    {
      id: '6',
      name: 'Office of Campus Safety',
      description: 'Campus police, emergency response, and safety services for the UGA community.',
      image: '/images/resources/safety.svg',
      location: 'Multiple Locations',
      phone: '(706) 542-2200',
      website: 'https://police.uga.edu',
      category: 'Safety',
    },
    {
      id: '7',
      name: 'Career Center',
      description: 'Job search assistance, resume building, interview prep, and networking events.',
      image: '/images/resources/career.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-8406',
      website: 'https://career.uga.edu',
      category: 'Career',
    },
    {
      id: '8',
      name: 'International Student Office',
      description: 'Support services for international students including visa guidance and cultural events.',
      image: '/images/resources/student-services.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-6820',
      website: 'https://iso.uga.edu',
      category: 'Student Services',
    },
    {
      id: '9',
      name: 'Writing Center',
      description: 'Free peer-tutoring for writing assignments across all disciplines and skill levels.',
      image: '/images/resources/academic.svg',
      location: 'Milledge Avenue',
      phone: '(706) 542-8844',
      website: 'https://writingcenter.uga.edu',
      category: 'Academic',
    },
    {
      id: '10',
      name: 'Math Tutoring Center',
      description: 'Specialized tutoring for mathematics courses including calculus, algebra, and statistics.',
      image: '/images/resources/academic.svg',
      location: 'Boyd Graduate Studies',
      phone: '(706) 542-4114',
      website: 'https://math.uga.edu',
      category: 'Academic',
    },
    {
      id: '11',
      name: 'Science Learning Center',
      description: 'Tutoring support for biology, chemistry, physics, and other science disciplines.',
      image: '/images/resources/academic.svg',
      location: 'Science Building',
      phone: '(706) 542-5400',
      website: 'https://sciencelearning.uga.edu',
      category: 'Academic',
    },
    {
      id: '12',
      name: 'Language Learning Lab',
      description: 'Tutoring and resources for foreign language studies and conversational practice.',
      image: '/images/resources/academic.svg',
      location: 'Romance Languages Building',
      phone: '(706) 542-3475',
      website: 'https://languages.uga.edu',
      category: 'Academic',
    },
    {
      id: '13',
      name: 'Disability Resource Center',
      description: 'Accommodations and support services for students with disabilities.',
      image: '/images/resources/student-services.svg',
      location: 'Downtown Campus',
      phone: '(706) 542-8719',
      website: 'https://drc.uga.edu',
      category: 'Student Services',
    },
    {
      id: '14',
      name: 'Office of Diversity and Inclusion',
      description: 'Resources and programs supporting underrepresented students and promoting campus diversity.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
      location: 'Downtown Campus',
      phone: '(706) 542-3344',
      website: 'https://diversity.uga.edu',
      category: 'Student Services',
    },
  ];

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        resource.name.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower) ||
        resource.category.toLowerCase().includes(searchLower) ||
        resource.location.toLowerCase().includes(searchLower)
      );
    });
  }, [searchTerm, resources]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navigation />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">UGA Campus Resources</h1>
            <p className="text-lg text-gray-800">
              Explore the services and facilities available to support your college experience
            </p>
          </div>

                  {/* Search Bar */}
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-600" />
                    <input
                      type="text"
                      placeholder="Search resources by name, category, or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-700 transition-colors"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Results count */}
                  <p className="text-sm text-gray-800 mt-3">
                    {filteredResources.length} of {resources.length} resources
                  </p>
        </div>

        {/* Resources Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                <img
                  src={resource.image}
                  alt={resource.name}
                  className="w-full h-48 object-cover"
                />

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{resource.name}</h3>
                    <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1 rounded-full whitespace-nowrap ml-2">
                      {resource.category}
                    </span>
                  </div>

                  <p className="text-gray-800 text-sm mb-4">{resource.description}</p>

                  {/* Details */}
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    {resource.location && (
                      <div className="flex items-start space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{resource.location}</span>
                      </div>
                    )}

                    {resource.phone && (
                      <div className="flex items-start space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                        <a href={`tel:${resource.phone}`} className="text-red-700 hover:underline">
                          {resource.phone}
                        </a>
                      </div>
                    )}

                    {resource.website && (
                      <div className="flex items-start space-x-2 text-sm">
                        <Globe className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                        <a
                          href={resource.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-700 hover:underline truncate"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-gray-800 mb-4">No resources found matching "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="text-red-700 hover:text-red-800 font-medium"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
