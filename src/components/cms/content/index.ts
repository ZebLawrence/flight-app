import type { ComponentType } from 'react';
import { Button } from './Button';
import { Heading } from './Heading';
import { Text } from './Text';
import { Image } from './Image';
import { Link } from './Link';
import { Icon } from './Icon';
import { List } from './List';

export const contentRegistry: Record<string, ComponentType<any>> = {
  Button,
  Heading,
  Text,
  Image,
  Link,
  Icon,
  List,
};
