import Script from 'next/script';

const GoogleAnalytics = () => (
  <>
    <Script strategy='lazyOnload' src='https://www.googletagmanager.com/gtag/js?id=G-H7B48D57P6' />
    <Script id='google-analytics' strategy='lazyOnload'>
      {`
         window.dataLayer = window.dataLayer || [];
         function gtag(){dataLayer.push(arguments);}
         gtag('js', new Date());
         gtag('config', 'G-H7B48D57P6');
      `}
    </Script>
  </>
);

export default GoogleAnalytics;
