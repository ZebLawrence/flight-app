import type { ComponentType } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Heading } from './Heading';
import { Text } from './Text';
import { Image } from './Image';
import { Link } from './Link';
import { Icon } from './Icon';
import { List } from './List';
import { Nav } from './Nav';
import { Header } from './Header';
import { Footer } from './Footer';

export const contentRegistry: Record<string, ComponentType<any>> = {
  Button,
  Card,
  Heading,
  Text,
  Image,
  Link,
  Icon,
  List,
  Nav,
  Header,
  Footer,
};
