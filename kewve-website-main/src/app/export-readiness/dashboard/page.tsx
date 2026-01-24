import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ExportReadinessDashboard from '@/containers/export-readiness/ExportReadinessDashboard';

export default function AssessmentDashboard() {
  return (
    <div className='overflow-x-hidden min-h-screen flex flex-col bg-cream'>
      <Header needsBackground />
      <ExportReadinessDashboard />
      <section className='bg-orange'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 200'>
          <path
            fill='#fafaf0'
            fillOpacity='1'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}


