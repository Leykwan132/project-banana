import { StyleSheet, useWindowDimensions } from 'react-native';
import { Carousel } from 'react-native-ui-lib';

import { Banner, BannerType } from '@/components/Banner';

interface BannerCarouselProps {
    types: BannerType[];
    height?: number;
}

export function BannerCarousel({ types, height = 160 }: BannerCarouselProps) {
    const { width } = useWindowDimensions();

    return (
        <Carousel
            autoplay
            autoplayInterval={4000}
            pageControlPosition={Carousel.pageControlPositions.UNDER}
            pageControlProps={{ size: 6, color: '#000000', inactiveColor: '#CCCCCC' }}
            containerStyle={[styles.carousel, { height: height + 20 }]}
            itemSpacings={16}
            pageWidth={width - 12}
        >
            {types.map((type, index) => (
                <Banner key={index} type={type} />
            ))}
        </Carousel>
    );
}

const styles = StyleSheet.create({
    carousel: {
        marginVertical: 8,
    },
});
